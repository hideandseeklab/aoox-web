/** Shared by the Audit log page and the dashboard's "Recent activity" card. */

/** A translator for the `settings` namespace (`useTranslations("settings")` / `getTranslations("settings")`). */
export type SettingsTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string

/** Known values of `AuditLog.via`; anything else is shown as received. */
const VIA_KEYS = new Set(["session", "token", "webhook", "anonymous"])

export function viaLabel(via: string, t: SettingsTranslate): string {
  return VIA_KEYS.has(via) ? t(`audit.via.${via}`) : via
}

export function statusVariant(s: number) {
  if (s >= 500) return "destructive" as const
  if (s >= 400) return "outline" as const
  return "default" as const
}

/**
 * Message key (under `settings.audit.routes`) for an audit `action` (the route template the API
 * records, e.g. `POST /applications/:id/deploy`). Every route has a text in both languages;
 * anything not listed falls back to the raw route.
 */
export const ACTION_KEY: Record<string, string> = {
  "POST /auth/sign-in": "postAuthSignIn",
  "POST /auth/sign-in/2fa": "postAuthSignIn2fa",
  "POST /auth/setup": "postAuthSetup",
  "POST /auth/2fa/setup": "postAuth2faSetup",
  "POST /auth/2fa/enable": "postAuth2faEnable",
  "POST /auth/2fa/disable": "postAuth2faDisable",
  "POST /users/me/password": "postUsersMePassword",
  "POST /users/:id/password": "postUsersPassword",
  "POST /users/:id/2fa/disable": "postUsers2faDisable",
  "PATCH /users/:id/role": "patchUsersRole",
  "DELETE /users/:id": "deleteUsers",
  "POST /invitations": "postInvitations",
  "POST /invitations/accept": "postInvitationsAccept",
  "DELETE /invitations/:id": "deleteInvitations",
  "POST /api-tokens": "postApiTokens",
  "DELETE /api-tokens/:id": "deleteApiTokens",
  "POST /projects": "postProjects",
  "PATCH /projects/:id": "patchProjects",
  "DELETE /projects/:id": "deleteProjects",
  "POST /projects/import": "postProjectsImport",
  "POST /projects/:id/members": "postProjectsMembers",
  "PATCH /projects/:id/members/:userId": "patchProjectsMembers",
  "DELETE /projects/:id/members/:userId": "deleteProjectsMembers",
  "POST /applications": "postApplications",
  "PATCH /applications/:id": "patchApplications",
  "DELETE /applications/:id": "deleteApplications",
  "POST /applications/:id/deploy": "postApplicationsDeploy",
  "POST /applications/:id/rollback": "postApplicationsRollback",
  "POST /applications/:id/start": "postApplicationsStart",
  "POST /applications/:id/stop": "postApplicationsStop",
  "POST /applications/:id/check-image": "postApplicationsCheckImage",
  "POST /applications/:id/console-ticket": "postApplicationsConsoleTicket",
  "POST /applications/:id/log-ticket": "postApplicationsLogTicket",
  "POST /applications/:id/domains": "postApplicationsDomains",
  "PATCH /applications/:id/domains/:domainId": "patchApplicationsDomains",
  "DELETE /applications/:id/domains/:domainId": "deleteApplicationsDomains",
  "POST /applications/:id/mounts": "postApplicationsMounts",
  "PATCH /applications/:id/mounts/:mountId": "patchApplicationsMounts",
  "DELETE /applications/:id/mounts/:mountId": "deleteApplicationsMounts",
  "POST /applications/:id/mounts/:mountId/backups":
    "postApplicationsMountsBackups",
  "PATCH /applications/:id/backup-schedule": "patchApplicationsBackupSchedule",
  "POST /applications/:id/jobs": "postApplicationsJobs",
  "PUT /applications/:id/monitor": "putApplicationsMonitor",
  "PUT /applications/:id/alerts": "putApplicationsAlerts",
  "PUT /databases/:id/alerts": "putDatabasesAlerts",
  "POST /applications/:id/monitor/check": "postApplicationsMonitorCheck",
  "PUT /applications/:id/secret-source": "putApplicationsSecretSource",
  "POST /applications/:id/secret-source/preview":
    "postApplicationsSecretSourcePreview",
  "PUT /applications/:id/webhook/secret": "putApplicationsWebhookSecret",
  "DELETE /applications/:id/webhook/secret": "deleteApplicationsWebhookSecret",
  "POST /applications/:id/webhook/regenerate":
    "postApplicationsWebhookRegenerate",
  "DELETE /previews/:id": "deletePreviews",
  "POST /webhooks/:token": "postWebhooks",
  "POST /compose-apps": "postComposeApps",
  "POST /compose-apps/from-template": "postComposeAppsFromTemplate",
  "PATCH /compose-apps/:id": "patchComposeApps",
  "DELETE /compose-apps/:id": "deleteComposeApps",
  "POST /compose-apps/:id/deploy": "postComposeAppsDeploy",
  "POST /compose-apps/:id/start": "postComposeAppsStart",
  "POST /compose-apps/:id/stop": "postComposeAppsStop",
  "POST /compose-apps/:id/jobs": "postComposeAppsJobs",
  "POST /compose-apps/:id/mounts": "postComposeAppsMounts",
  "PATCH /compose-apps/:id/mounts/:mountId": "patchComposeAppsMounts",
  "DELETE /compose-apps/:id/mounts/:mountId": "deleteComposeAppsMounts",
  "PUT /compose-apps/:id/webhook/secret": "putComposeAppsWebhookSecret",
  "DELETE /compose-apps/:id/webhook/secret": "deleteComposeAppsWebhookSecret",
  "POST /compose-apps/:id/webhook/regenerate":
    "postComposeAppsWebhookRegenerate",
  "POST /webhooks/compose/:token": "postWebhooksCompose",
  "POST /databases": "postDatabases",
  "PATCH /databases/:id": "patchDatabases",
  "DELETE /databases/:id": "deleteDatabases",
  "POST /databases/:id/start": "postDatabasesStart",
  "POST /databases/:id/stop": "postDatabasesStop",
  "POST /databases/:id/schemas": "postDatabasesSchemas",
  "DELETE /databases/:id/schemas/:name": "deleteDatabasesSchemas",
  "POST /databases/:id/query": "postDatabasesQuery",
  "POST /databases/:id/import": "postDatabasesImport",
  "PATCH /databases/:id/tables/:table/rows": "patchDatabasesTablesRows",
  "DELETE /databases/:id/tables/:table/rows": "deleteDatabasesTablesRows",
  "DELETE /databases/:id/query-history": "deleteDatabasesQueryHistory",
  "POST /databases/:id/backups": "postDatabasesBackups",
  "PATCH /databases/:id/backup-schedule": "patchDatabasesBackupSchedule",
  "POST /databases/:id/jobs": "postDatabasesJobs",
  "POST /databases/:id/mounts": "postDatabasesMounts",
  "PATCH /databases/:id/mounts/:mountId": "patchDatabasesMounts",
  "DELETE /databases/:id/mounts/:mountId": "deleteDatabasesMounts",
  "POST /databases/:id/companion": "postDatabasesCompanion",
  "DELETE /databases/:id/companion": "deleteDatabasesCompanion",
  "POST /backups/:id/restore": "postBackupsRestore",
  "DELETE /backups/:id": "deleteBackups",
  "POST /volume-backups/:id/restore": "postVolumeBackupsRestore",
  "DELETE /volume-backups/:id": "deleteVolumeBackups",
  "PATCH /jobs/:id": "patchJobs",
  "DELETE /jobs/:id": "deleteJobs",
  "POST /jobs/:id/run": "postJobsRun",
  "POST /registries": "postRegistries",
  "DELETE /registries/:id": "deleteRegistries",
  "POST /registries/:id/test": "postRegistriesTest",
  "PATCH /registries/:id/domain": "patchRegistriesDomain",
  "POST /registries/self-hosted": "postRegistriesSelfHosted",
  "DELETE /registries/self-hosted": "deleteRegistriesSelfHosted",
  "POST /registries/self-hosted/garbage-collect":
    "postRegistriesSelfHostedGarbageCollect",
  "DELETE /registries/:id/repositories/*repository":
    "deleteRegistriesRepositoriesRepository",
  "DELETE /registries/:id/repositories/*repository/tags/:tag":
    "deleteRegistriesRepositoriesRepositoryTags",
  "POST /certificates": "postCertificates",
  "PUT /certificates/:id": "putCertificates",
  "DELETE /certificates/:id": "deleteCertificates",
  "POST /git-credentials": "postGitCredentials",
  "DELETE /git-credentials/:id": "deleteGitCredentials",
  "POST /secret-connections": "postSecretConnections",
  "DELETE /secret-connections/:id": "deleteSecretConnections",
  "POST /secret-connections/:id/test": "postSecretConnectionsTest",
  "POST /dns-connections": "postDnsConnections",
  "DELETE /dns-connections/:id": "deleteDnsConnections",
  "POST /dns-connections/:id/test": "postDnsConnectionsTest",
  "PUT /proxy/dns": "putProxyDns",
  "DELETE /proxy/dns": "deleteProxyDns",
  "POST /applications/:id/domains/:domainId/dns/sync": "postApplicationsDomainsDnsSync",
  "POST /backup-destinations": "postBackupDestinations",
  "DELETE /backup-destinations/:id": "deleteBackupDestinations",
  "POST /backup-destinations/:id/test": "postBackupDestinationsTest",
  "POST /notifications": "postNotifications",
  "DELETE /notifications/:id": "deleteNotifications",
  "POST /notifications/:id/test": "postNotificationsTest",
  "POST /servers": "postServers",
  "DELETE /servers/:id": "deleteServers",
  "POST /servers/:id/test": "postServersTest",
  "POST /servers/:id/proxy": "postServersProxy",
  "DELETE /servers/:id/proxy": "deleteServersProxy",
  "POST /proxy": "postProxy",
  "DELETE /proxy": "deleteProxy",
  "POST /proxy/config": "postProxyConfig",
  "PUT /proxy/config/:id": "putProxyConfig",
  "DELETE /proxy/config/:id": "deleteProxyConfig",
  "POST /proxy/config/sync": "postProxyConfigSync",
  "POST /proxy/config/presets/:preset": "postProxyConfigPresets",
  "POST /swarm/init": "postSwarmInit",
  "DELETE /swarm": "deleteSwarm",
  "PATCH /swarm/nodes/:id": "patchSwarmNodes",
  "DELETE /swarm/nodes/:id": "deleteSwarmNodes",
  "POST /terminal/tickets": "postTerminalTickets",
  "POST /terminal/authorize": "postTerminalAuthorize",
  "POST /inbox/read": "postInboxRead",
  "POST /onboarding/dismiss": "postOnboardingDismiss",
  "POST /maintenance/cleanup": "postMaintenanceCleanup",
  "POST /docker/containers/:id/start": "postDockerContainersStart",
  "POST /docker/containers/:id/stop": "postDockerContainersStop",
  "POST /docker/containers/:id/restart": "postDockerContainersRestart",
  "DELETE /docker/containers/:id": "deleteDockerContainers",
  "DELETE /docker/images/:id": "deleteDockerImages",
  "POST /docker/images/prune": "postDockerImagesPrune",
  "POST /instance/backups": "postInstanceBackups",
  "POST /instance/backups/:id/restore": "postInstanceBackupsRestore",
  "POST /instance/restore": "postInstanceRestore",
  "DELETE /instance/backups/:id": "deleteInstanceBackups",
  "PATCH /instance/backup-settings": "patchInstanceBackupSettings",
  "PATCH /instance/domain": "patchInstanceDomain",
  "PATCH /instance/env": "patchInstanceEnv",
  "POST /instance/update/apply": "postInstanceUpdateApply",
}

export function describeAction(action: string, t: SettingsTranslate): string {
  const key = ACTION_KEY[action]
  return key ? t(`audit.routes.${key}`) : action
}
