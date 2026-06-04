# Ram Setu Tally Bridge

Small secured HTTPS API for connecting Ram Setu ERP with Tally Prime Cloud.

Recommended mode is XML/HTTP:

```env
TALLY_ACCESS_MODE=xml
TALLY_XML_URL=http://127.0.0.1:8080
```

ODBC is optional and only needed if XML/HTTP is not allowed.

## Start

```bash
npm install
copy .env.example .env
npm start
```

All requests need:

```http
Authorization: Bearer <BRIDGE_API_KEY>
```

Read `TALLY_TEAM_INSTRUCTIONS.md` for the complete one-time setup steps.
