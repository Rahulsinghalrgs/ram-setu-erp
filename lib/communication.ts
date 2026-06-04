import { createClient } from "@/lib/supabase/server";

export type CommunicationLog = {
  id: string;
  channel: string;
  provider: string;
  workflow: string;
  reference_key: string | null;
  recipient_name: string | null;
  recipient_contact: string;
  template_name: string | null;
  subject: string | null;
  message_preview: string | null;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  provider_response?: Record<string, any> | null;
  status_checked_at?: string | null;
  sent_at: string | null;
  created_at: string;
};

export type WorkflowReminder = {
  id: string;
  workflow: string;
  reference_key: string | null;
  client_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  channel: string;
  template_name: string | null;
  subject: string | null;
  message_preview: string | null;
  due_date: string;
  priority: string;
  status: string;
  owner_name: string | null;
  last_sent_at: string | null;
  next_attempt_at: string | null;
  remarks: string | null;
  created_at: string;
};

export type WatiSendResult = {
  ok: boolean;
  error?: string;
  result?: any;
  providerResponse?: any;
  providerMessageId?: string | null;
  waId?: string | null;
};

export const watiApiEndpoint = process.env.WATI_API_ENDPOINT || "";
const watiAccessToken = process.env.WATI_ACCESS_TOKEN || "";
const watiChannelNumber = process.env.WATI_CHANNEL_NUMBER || "918766217369";

export function isWatiConfigured() {
  return Boolean(watiApiEndpoint && watiAccessToken);
}

export function getWatiDiagnostics() {
  return {
    configured: isWatiConfigured(),
    endpointConfigured: Boolean(watiApiEndpoint),
    tokenConfigured: Boolean(watiAccessToken),
    channelNumber: watiChannelNumber,
    endpointHost: watiApiEndpoint ? new URL(watiApiEndpoint).host : ""
  };
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91")) return digits;
  return digits.length === 10 ? `91${digits}` : digits;
}

function getWatiBaseEndpoints() {
  const endpoint = watiApiEndpoint.replace(/\/$/, "");
  const endpoints = new Set<string>();

  endpoints.add(endpoint);
  if (endpoint.includes("live.wati.io")) {
    endpoints.add(endpoint.replace("live.wati.io", "live-mt-server.wati.io"));
  }

  return Array.from(endpoints);
}

function getWatiTemplateEndpoint() {
  const endpoint = watiApiEndpoint.replace(/\/$/, "");
  if (endpoint.includes("live.wati.io")) {
    return endpoint.replace("live.wati.io", "live-mt-server.wati.io");
  }
  return endpoint;
}

function getWatiErrorDetail(result: any) {
  return (
    result?.message ||
    result?.error ||
    result?.errors?.join?.(", ") ||
    JSON.stringify(result).slice(0, 500) ||
    "No response body"
  );
}

function buildTemplatePayloads({
  templateName,
  parameters
}: {
  templateName: string;
  parameters: Array<string | { name: string; value: string }>;
}) {
  const namedParameters = parameters
    .map((parameter, index) => ({
      name: typeof parameter === "string" ? String(index + 1) : parameter.name,
      value: typeof parameter === "string" ? parameter : parameter.value
    }))
    .filter((parameter) => parameter.value);
  const positionalParameters = namedParameters.map((parameter, index) => ({
    name: String(index + 1),
    value: parameter.value
  }));
  const base = {
    template_name: templateName,
    broadcast_name: `ram_setu_${templateName}`
  };
  const channelNumber = normalizePhone(watiChannelNumber);

  return [
    { ...base, channelNumber, parameters: namedParameters },
    { ...base, channelNumber, parameters: positionalParameters },
    { ...base, channel_number: channelNumber, parameters: namedParameters },
    { ...base, channel_number: channelNumber, parameters: positionalParameters },
    { ...base, parameters: namedParameters },
    { ...base, parameters: positionalParameters }
  ];
}

async function upsertWatiContact({
  phone,
  name,
  parameters
}: {
  phone: string;
  name: string;
  parameters: Array<string | { name: string; value: string }>;
}) {
  const whatsappNumber = normalizePhone(phone);
  const namedParameters = parameters
    .map((parameter, index) => ({
      name: typeof parameter === "string" ? String(index + 1) : parameter.name,
      value: typeof parameter === "string" ? parameter : parameter.value
    }))
    .filter((parameter) => parameter.name && parameter.value);

  const body = {
    name: name || whatsappNumber,
    customParams: [
      { name: "source", value: "Ram Setu ERP" },
      ...namedParameters
    ]
  };

  const errors: string[] = [];
  const attempts: any[] = [];

  for (const endpoint of getWatiBaseEndpoints()) {
    const url = `${endpoint}/api/v1/addContact/${whatsappNumber}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${watiAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const result = await response.json().catch(() => ({}));
    attempts.push({ status: response.status, endpoint: new URL(url).host, result });
    if (response.ok && result?.result !== false && !result?.error) {
      return { ok: true, result, attempts };
    }

    errors.push(`${response.status} ${new URL(url).host}${new URL(url).pathname}: ${getWatiErrorDetail(result)}`);
  }

  return { ok: false, error: errors.join(" | "), attempts };
}

export async function sendWatiTemplateMessage({
  phone,
  templateName,
  parameters,
  contactName
}: {
  phone: string;
  templateName: string;
  parameters: Array<string | { name: string; value: string }>;
  contactName?: string;
}): Promise<WatiSendResult> {
  if (!isWatiConfigured()) {
    return { ok: false, error: "WATI endpoint/token not configured.", providerResponse: { configured: false } };
  }

  const whatsappNumber = normalizePhone(phone);
  const contactResult = await upsertWatiContact({
    phone: whatsappNumber,
    name: contactName || whatsappNumber,
    parameters
  });
  if (!contactResult.ok) {
    return {
      ok: false,
      error: `WATI contact sync failed. ${contactResult.error}`,
      providerResponse: { contact: contactResult }
    };
  }

  const attempts = [`${getWatiTemplateEndpoint()}/api/v2/sendTemplateMessage?whatsappNumber=${whatsappNumber}`];
  const errors: string[] = [];
  const providerAttempts: any[] = [];

  for (const url of attempts) {
    for (const body of buildTemplatePayloads({ templateName, parameters })) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${watiAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const result = await response.json().catch(() => ({}));
      providerAttempts.push({
        status: response.status,
        endpoint: new URL(url).host,
        path: new URL(url).pathname,
        result
      });
      const receiver = Array.isArray(result?.receivers) ? result.receivers[0] : null;
      const receiverError = receiver?.errors?.length ? receiver.errors.join(", ") : "";
      const contactOptedOut = result?.contact?.optedIn === false;
      if (
        response.ok &&
        result?.result !== false &&
        !result?.error &&
        !contactOptedOut &&
        (!receiver || (receiver.isValidWhatsAppNumber !== false && !receiverError))
      ) {
        return {
          ok: true,
          result,
          providerResponse: { contact: contactResult, attempts: providerAttempts },
          providerMessageId: receiver?.localMessageId || result?.local_message_id || result?.localMessageId || null,
          waId: receiver?.waId || result?.phone_number || whatsappNumber
        };
      }

      if (response.ok && receiver?.isValidWhatsAppNumber === false) {
        errors.push(`WATI accepted request but receiver ${whatsappNumber} is not a valid WhatsApp number.`);
      } else if (response.ok && receiverError) {
        errors.push(`WATI receiver error: ${receiverError}`);
      } else if (response.ok && contactOptedOut) {
        return {
          ok: false,
          error: `WATI contact ${whatsappNumber} is not opted-in. Ask the recipient to send "Hi" to +${normalizePhone(
            watiChannelNumber
          )}, then retry.`,
          providerResponse: { contact: contactResult, attempts: providerAttempts }
        };
      } else {
        errors.push(`${response.status} ${new URL(url).host}${new URL(url).pathname}: ${getWatiErrorDetail(result)}`);
      }
    }
  }

  return { ok: false, error: `WATI failed. ${errors.join(" | ")}`, providerResponse: { contact: contactResult, attempts: providerAttempts } };
}

export async function getWatiMessageStatus({
  phone,
  localMessageId
}: {
  phone: string;
  localMessageId: string;
}) {
  if (!isWatiConfigured()) {
    return { ok: false, error: "WATI endpoint/token not configured." };
  }

  const whatsappNumber = normalizePhone(phone);
  const errors: string[] = [];

  for (const endpoint of getWatiBaseEndpoints()) {
    const url = `${endpoint}/api/v1/whatsApp/messages/${whatsappNumber}/${localMessageId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${watiAccessToken}`,
        "Content-Type": "application/json"
      }
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok && result) {
      return { ok: true, result };
    }

    errors.push(`${response.status} ${new URL(url).host}${new URL(url).pathname}: ${getWatiErrorDetail(result)}`);
  }

  return { ok: false, error: errors.join(" | ") };
}

export async function getCommunicationLogs(organizationId: string) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const { data, error } = await db
      .from("communication_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) throw error;
    return { logs: (data || []) as CommunicationLog[], error: null as string | null };
  } catch {
    return {
      logs: [] as CommunicationLog[],
      error: "Communication log table is not active yet."
    };
  }
}

export async function getWorkflowReminders(organizationId: string) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const { data, error } = await db
      .from("workflow_reminders")
      .select("*")
      .eq("organization_id", organizationId)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) throw error;
    return { reminders: (data || []) as WorkflowReminder[], error: null as string | null };
  } catch {
    return {
      reminders: [] as WorkflowReminder[],
      error: "Reminder table is not active yet."
    };
  }
}
