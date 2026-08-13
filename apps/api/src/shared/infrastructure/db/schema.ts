import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  type AnyPgColumn,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const authRoleEnum = pgEnum('auth_role', [
  'platform-admin',
  'company-owner',
  'company-user',
]);

export const provisioningStatusEnum = pgEnum('provisioning_status', [
  'running',
  'succeeded',
  'failed',
  'incomplete',
]);

export const provisioningStepStatusEnum = pgEnum('provisioning_step_status', [
  'pending',
  'succeeded',
  'failed',
  'skipped',
]);

export const itemTypeEnum = pgEnum('item_type', ['product', 'service']);

export const itemUnitEnum = pgEnum('item_unit', [
  'unit',
  'hour',
  'kg',
  'liter',
  'meter',
  'box',
  'service',
]);

export const itemTrackBatchModeEnum = pgEnum('item_track_batch_mode', [
  'none',
  'batch',
  'serial',
]);

export const companyStatusEnum = pgEnum('company_status', [
  'active',
  'suspended',
  'provisioning_failed',
]);

export const areaKindEnum = pgEnum('area_kind', ['area', 'department']);

export const permissionFamilyEnum = pgEnum('permission_family', [
  'normal',
  'reserved',
]);

export const scopeNodeTypeEnum = pgEnum('scope_node_type', [
  'company',
  'division',
  'local',
  'area',
  'warehouse',
  'point-of-sale',
]);

export const roleAssignmentModeEnum = pgEnum('role_assignment_mode', [
  'subtree_inclusive',
  'exact_node',
]);

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const sessionsTable = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const membershipsTable = pgTable('memberships', {
  userId: text('user_id').notNull(),
  companyId: text('company_id'),
  divisionId: text('division_id'),
  localId: text('local_id'),
  role: authRoleEnum('role').notNull(),
});

export const companiesTable = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: companyStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const divisionsTable = pgTable(
  'divisions',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('divisions_id_company_idx').on(table.id, table.companyId),
    uniqueIndex('divisions_company_name_idx').on(
      table.companyId,
      table.name,
    ),
  ],
);

export const privacyConsentsTable = pgTable(
  'privacy_consents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    companyId: text('company_id').notNull(),
    policyVersion: text('policy_version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('privacy_consents_user_company_version_idx').on(
      table.userId,
      table.companyId,
      table.policyVersion,
    ),
  ],
);

export const privacyPolicyAcceptancesTable = pgTable(
  'privacy_policy_acceptances',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    policyVersion: text('policy_version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('privacy_policy_acceptances_user_version_idx').on(
      table.userId,
      table.policyVersion,
    ),
  ],
);

export const userPreferencesTable = pgTable('user_preferences', {
  userId: text('user_id').primaryKey(),
  activeCompanyId: text('active_company_id').references(
    () => companiesTable.id,
  ),
  activeLocalId: text('active_local_id'),
  activeScopeNodeId: text('active_scope_node_id').references(
    () => scopeNodesTable.id,
    { onDelete: 'restrict' },
  ),
});

export const permissionsTable = pgTable(
  'permissions',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    family: permissionFamilyEnum('family').notNull(),
  },
  (table) => [uniqueIndex('permissions_key_idx').on(table.key)],
);

export const rolesTable = pgTable(
  'roles',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('roles_company_key_idx').on(table.companyId, table.key),
    index('roles_company_idx').on(table.companyId),
  ],
);

export const rolePermissionsTable = pgTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => rolesTable.id, { onDelete: 'restrict' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissionsTable.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('role_permissions_role_permission_idx').on(
      table.roleId,
      table.permissionId,
    ),
    index('role_permissions_permission_idx').on(table.permissionId),
  ],
);

export const roleAssignmentsTable = pgTable(
  'role_assignments',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    roleId: text('role_id')
      .notNull()
      .references(() => rolesTable.id, { onDelete: 'restrict' }),
    scopeNodeId: text('scope_node_id')
      .notNull()
      .references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
    mode: roleAssignmentModeEnum('mode')
      .notNull()
      .default('subtree_inclusive'),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeId: text('scope_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('role_assignments_user_company_idx').on(table.userId, table.companyId),
    index('role_assignments_scope_node_idx').on(table.scopeNodeId),
    index('role_assignments_scope_idx').on(table.scopeType, table.scopeId),
    uniqueIndex('role_assignments_unique_scope_idx').on(
      table.companyId,
      table.userId,
      table.roleId,
      table.scopeType,
      table.scopeId,
    ),
  ],
);

export const staleRoleAssignmentsTable = pgTable(
  'stale_role_assignments',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id').notNull(),
    userId: text('user_id').notNull(),
    roleId: text('role_id').notNull(),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeId: text('scope_id'),
    expectedScopeNodeId: text('expected_scope_node_id'),
    quarantineReason: text('quarantine_reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    quarantinedAt: timestamp('quarantined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('stale_role_assignments_company_idx').on(table.companyId)],
);

export const scopeNodesTable = pgTable(
  'scope_nodes',
  {
    id: text('id').primaryKey(),
    nodeType: scopeNodeTypeEnum('node_type').notNull(),
    sourceId: text('source_id').notNull(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    parentScopeNodeId: text('parent_scope_node_id').references(
      (): AnyPgColumn => scopeNodesTable.id,
      { onDelete: 'restrict' },
    ),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('scope_nodes_node_source_idx').on(table.nodeType, table.sourceId),
    index('scope_nodes_company_idx').on(table.companyId),
    index('scope_nodes_parent_scope_node_idx').on(table.parentScopeNodeId),
  ],
);

export const nodeResponsibilitiesTable = pgTable(
  'node_responsibilities',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    scopeNodeId: text('scope_node_id')
      .notNull()
      .references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeId: text('scope_id').notNull(),
    responsibleUserId: text('responsible_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    managedRoleKey: text('managed_role_key').notNull().default('node-manager'),
    assignmentMode: roleAssignmentModeEnum('assignment_mode')
      .notNull()
      .default('subtree_inclusive'),
    baseMembershipRole: authRoleEnum('base_membership_role')
      .notNull()
      .default('company-user'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    index('node_responsibilities_company_idx').on(table.companyId),
    index('node_responsibilities_scope_node_idx').on(table.scopeNodeId),
    index('node_responsibilities_scope_idx').on(table.scopeType, table.scopeId),
    index('node_responsibilities_user_idx').on(table.responsibleUserId),
    uniqueIndex('node_responsibilities_active_scope_node_idx')
      .on(table.scopeNodeId)
      .where(sql`${table.isActive} = true AND ${table.endedAt} IS NULL`),
  ],
);

export const nodeManagementInvitationsTable = pgTable(
  'node_management_invitations',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    scopeNodeId: text('scope_node_id')
      .notNull()
      .references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
    scopeType: scopeNodeTypeEnum('scope_type').notNull(),
    scopeId: text('scope_id').notNull(),
    inviteeEmail: text('invitee_email').notNull(),
    tokenHash: text('token_hash').notNull(),
    managedRoleKey: text('managed_role_key').notNull().default('node-manager'),
    baseMembershipRole: authRoleEnum('base_membership_role')
      .notNull()
      .default('company-user'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByUserId: text('accepted_by_user_id').references(() => usersTable.id, {
      onDelete: 'restrict',
    }),
  },
  (table) => [
    index('node_management_invitations_company_idx').on(table.companyId),
    index('node_management_invitations_scope_node_idx').on(table.scopeNodeId),
    uniqueIndex('node_management_invitations_token_hash_idx').on(table.tokenHash),
    index('node_management_invitations_invitee_email_idx').on(table.inviteeEmail),
    check(
      'node_management_invitations_acceptance_chk',
      sql`(${table.acceptedAt} IS NULL AND ${table.acceptedByUserId} IS NULL) OR (${table.acceptedAt} IS NOT NULL AND ${table.acceptedByUserId} IS NOT NULL)`,
    ),
  ],
);

export const companyProfilesTable = pgTable('company_profiles', {
  companyId: text('company_id').primaryKey(),
  legalIdentifier: text('legal_identifier').notNull(),
  services: text('services').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  exactLocation: text('exact_location').notNull(),
  contactPhone: text('contact_phone').notNull(),
  contactEmail: text('contact_email').notNull(),
  erpModuleId: text('erp_module_id').notNull().default('inventory'),
});

export const companyServicesTable = pgTable(
  'company_services',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('company_services_company_name_idx').on(
      table.companyId,
      table.name,
    ),
  ],
);

export const itemCategoriesTable = pgTable(
  'item_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    parentId: uuid('parent_id').references(
      (): AnyPgColumn => itemCategoriesTable.id,
    ),
    localId: text('local_id'),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('item_categories_company_local_parent_name_idx').on(
      table.companyId,
      table.localId,
      table.parentId,
      table.name,
    ),
  ],
);

export const itemsTable = pgTable(
  'items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    categoryId: uuid('category_id').references(() => itemCategoriesTable.id),
    sku: text('sku'),
    localId: text('local_id'),
    name: text('name').notNull(),
    type: itemTypeEnum('type').notNull().default('product'),
    unit: itemUnitEnum('unit').notNull().default('unit'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    tracksStock: boolean('tracks_stock').notNull().default(false),
    trackBatchMode: itemTrackBatchModeEnum('track_batch_mode')
      .notNull()
      .default('none'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('items_company_local_sku_idx')
      .on(table.companyId, table.localId, table.sku)
      .where(sql`${table.sku} IS NOT NULL`),
  ],
);

export const localsTable = pgTable(
  'locals',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    divisionId: text('division_id').references(() => divisionsTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    locale: text('locale'),
  },
  (table) => [
    uniqueIndex('locals_id_company_idx').on(table.id, table.companyId),
    foreignKey({
      columns: [table.divisionId, table.companyId],
      foreignColumns: [divisionsTable.id, divisionsTable.companyId],
      name: 'locals_division_company_fk',
    }),
    uniqueIndex('locals_company_name_root_idx')
      .on(table.companyId, table.name)
      .where(sql`${table.divisionId} IS NULL`),
    uniqueIndex('locals_division_name_idx')
      .on(table.divisionId, table.name)
      .where(sql`${table.divisionId} IS NOT NULL`),
    index('locals_company_idx').on(table.companyId),
    index('locals_division_idx').on(table.divisionId),
  ],
);

export const areasTable = pgTable(
  'areas',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    divisionId: text('division_id').references(() => divisionsTable.id, {
      onDelete: 'restrict',
    }),
    localId: text('local_id').references(() => localsTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    kind: areaKindEnum('kind').notNull().default('area'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('areas_id_company_idx').on(table.id, table.companyId),
    check(
      'areas_exactly_one_parent_check',
      sql`((${table.divisionId} IS NOT NULL AND ${table.localId} IS NULL) OR (${table.divisionId} IS NULL AND ${table.localId} IS NOT NULL))`,
    ),
    foreignKey({
      columns: [table.divisionId, table.companyId],
      foreignColumns: [divisionsTable.id, divisionsTable.companyId],
      name: 'areas_division_company_fk',
    }),
    foreignKey({
      columns: [table.localId, table.companyId],
      foreignColumns: [localsTable.id, localsTable.companyId],
      name: 'areas_local_company_fk',
    }),
    uniqueIndex('areas_company_division_kind_name_idx')
      .on(table.companyId, table.divisionId, table.kind, table.name)
      .where(sql`${table.divisionId} IS NOT NULL AND ${table.localId} IS NULL`),
    uniqueIndex('areas_company_local_kind_name_idx')
      .on(table.companyId, table.localId, table.kind, table.name)
      .where(sql`${table.localId} IS NOT NULL AND ${table.divisionId} IS NULL`),
    index('areas_company_idx').on(table.companyId),
    index('areas_division_idx').on(table.divisionId),
    index('areas_local_idx').on(table.localId),
  ],
);

export const employeesTable = pgTable(
  'employees',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id, { onDelete: 'restrict' }),
    userId: text('user_id').references(() => usersTable.id, { onDelete: 'restrict' }),
    position: text('position').notNull(),
    areaId: text('area_id').references(() => areasTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('employees_company_idx').on(table.companyId),
    index('employees_area_idx').on(table.areaId),
    uniqueIndex('employees_company_user_unique_idx')
      .on(table.companyId, table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
  ],
);

export const warehousesTable = pgTable(
  'warehouses',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    areaId: text('area_id').references(() => areasTable.id),
    localId: text('local_id').references(() => localsTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('warehouses_id_company_idx').on(table.id, table.companyId),
    check(
      'warehouses_exactly_one_parent_check',
      sql`((${table.areaId} IS NOT NULL AND ${table.localId} IS NULL) OR (${table.areaId} IS NULL AND ${table.localId} IS NOT NULL))`,
    ),
    foreignKey({
      columns: [table.areaId, table.companyId],
      foreignColumns: [areasTable.id, areasTable.companyId],
      name: 'warehouses_area_company_fk',
    }),
    foreignKey({
      columns: [table.localId, table.companyId],
      foreignColumns: [localsTable.id, localsTable.companyId],
      name: 'warehouses_local_company_fk',
    }),
    uniqueIndex('warehouses_company_area_name_idx')
      .on(table.companyId, table.areaId, table.name)
      .where(sql`${table.areaId} IS NOT NULL AND ${table.localId} IS NULL`),
    uniqueIndex('warehouses_company_local_name_idx')
      .on(table.companyId, table.localId, table.name)
      .where(sql`${table.localId} IS NOT NULL AND ${table.areaId} IS NULL`),
    index('warehouses_company_idx').on(table.companyId),
    index('warehouses_local_idx').on(table.localId),
    index('warehouses_area_idx').on(table.areaId),
  ],
);

export const pointsOfSaleTable = pgTable(
  'points_of_sale',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companiesTable.id),
    areaId: text('area_id').references(() => areasTable.id),
    localId: text('local_id').references(() => localsTable.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('points_of_sale_id_company_idx').on(table.id, table.companyId),
    check(
      'points_of_sale_exactly_one_parent_check',
      sql`((${table.areaId} IS NOT NULL AND ${table.localId} IS NULL) OR (${table.areaId} IS NULL AND ${table.localId} IS NOT NULL))`,
    ),
    foreignKey({
      columns: [table.areaId, table.companyId],
      foreignColumns: [areasTable.id, areasTable.companyId],
      name: 'points_of_sale_area_company_fk',
    }),
    foreignKey({
      columns: [table.localId, table.companyId],
      foreignColumns: [localsTable.id, localsTable.companyId],
      name: 'points_of_sale_local_company_fk',
    }),
    uniqueIndex('points_of_sale_company_area_name_idx')
      .on(table.companyId, table.areaId, table.name)
      .where(sql`${table.areaId} IS NOT NULL AND ${table.localId} IS NULL`),
    uniqueIndex('points_of_sale_company_local_name_idx')
      .on(table.companyId, table.localId, table.name)
      .where(sql`${table.localId} IS NOT NULL AND ${table.areaId} IS NULL`),
    index('points_of_sale_company_idx').on(table.companyId),
    index('points_of_sale_local_idx').on(table.localId),
    index('points_of_sale_area_idx').on(table.areaId),
  ],
);

export const themePreferencesTable = pgTable('theme_preferences', {
  userId: text('user_id').primaryKey(),
  companyId: text('company_id'),
  paletteId: text('palette_id').notNull(),
});

export const notificationsTable = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id').notNull(),
    targetRole: authRoleEnum('target_role').notNull(),
    type: text('type').notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('notifications_target_role_idx').on(table.targetRole)],
);

export const auditEventsTable = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id').notNull(),
    companyId: text('company_id').notNull(),
    divisionId: text('division_id'),
    localId: text('local_id'),
    type: text('type').notNull(),
    correlationId: text('correlation_id'),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    details: jsonb('details').notNull(),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('audit_events_company_created_at_idx').on(
      table.companyId,
      table.createdAt,
    ),
    index('audit_events_correlation_id_idx').on(table.correlationId),
    index('audit_events_local_id_idx').on(table.localId),
  ],
);

export const provisioningRunsTable = pgTable(
  'provisioning_runs',
  {
    id: text('id').primaryKey(),
    correlationId: text('correlation_id').notNull(),
    requestId: text('request_id').notNull(),
    actorUserId: text('actor_user_id').notNull(),
    process: text('process').notNull(),
    companyName: text('company_name'),
    status: provisioningStatusEnum('status').notNull(),
    attempt: integer('attempt').notNull().default(1),
    idempotencyKey: text('idempotency_key'),
    errorSummary: text('error_summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('provisioning_runs_process_idempotency_idx')
      .on(table.process, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index('provisioning_runs_correlation_id_idx').on(table.correlationId),
    index('provisioning_runs_status_created_at_idx').on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const provisioningStepsTable = pgTable(
  'provisioning_steps',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    name: text('name').notNull(),
    status: provisioningStepStatusEnum('status').notNull(),
    attempt: integer('attempt').notNull().default(1),
    detail: jsonb('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('provisioning_steps_run_id_created_at_idx').on(
      table.runId,
      table.createdAt,
    ),
    index('provisioning_steps_status_idx').on(table.status),
  ],
);

export const applicationErrorsTable = pgTable(
  'application_errors',
  {
    id: text('id').primaryKey(),
    correlationId: text('correlation_id').notNull(),
    requestId: text('request_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    status: text('status').notNull(),
    code: text('code').notNull(),
    message: text('message').notNull(),
    stack: text('stack'),
    context: jsonb('context'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('application_errors_correlation_id_idx').on(table.correlationId),
    index('application_errors_fingerprint_idx').on(table.fingerprint),
    index('application_errors_created_at_idx').on(table.createdAt),
  ],
);
