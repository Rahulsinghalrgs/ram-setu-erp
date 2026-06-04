import { sidebarGroups } from "@/lib/erp-data";
import { canAccessModule, getAppContext } from "@/lib/erp-queries";
import { isPermissionModuleKey } from "@/lib/access-control";
import { SidebarClient } from "@/components/sidebar-client";

export async function Sidebar() {
  const access = await getAppContext();
  const visibleGroups = sidebarGroups.filter((item) => {
    if (item.keys.includes("overview")) {
      return true;
    }

    return item.keys.some((key) => {
      if (key === "settings") {
        return access.isAdmin;
      }

      return isPermissionModuleKey(key) && canAccessModule(access, key);
    });
  });

  return <SidebarClient allowedGroupHrefs={visibleGroups.map((group) => group.href)} />;
}
