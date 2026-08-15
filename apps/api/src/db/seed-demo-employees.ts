import { eq } from 'drizzle-orm';

import { companiesTable, employeesTable } from '../shared/infrastructure/db/schema';
import { createDb } from '../shared/infrastructure/db/client';

const demoEmployees = [
  ['Valentina Ríos', 'valentina.rios@example.com', 'active', '2025-02-14'],
  ['Santiago Herrera', 'santiago.herrera@example.com', 'active', '2024-11-08'],
  ['Camila Torres', 'camila.torres@example.com', 'suspended', '2025-04-22'],
  ['Nicolás Mendoza', 'nicolas.mendoza@example.com', 'active', '2023-09-18'],
  ['Laura Castillo', 'laura.castillo@example.com', 'separated', '2022-06-30'],
  ['Andrés Navarro', 'andres.navarro@example.com', 'active', '2025-01-27'],
  ['Sofía Paredes', 'sofia.paredes@example.com', 'suspended', '2024-08-05'],
  ['Julián Morales', 'julian.morales@example.com', 'active', '2023-12-11'],
  ['Daniela Vargas', 'daniela.vargas@example.com', 'separated', '2021-10-04'],
  ['Tomás Fuentes', 'tomas.fuentes@example.com', 'active', '2025-06-16'],
] as const;

const run = async () => {
  const db = createDb(process.env.DATABASE_URL);
  const requestedCompanyId = process.argv[2] ?? process.env.SEED_EMPLOYEES_COMPANY_ID;
  const [company] = requestedCompanyId
    ? await db
        .select({ id: companiesTable.id })
        .from(companiesTable)
        .where(eq(companiesTable.id, requestedCompanyId))
        .limit(1)
    : await db
        .select({ id: companiesTable.id })
        .from(companiesTable)
        .where(eq(companiesTable.status, 'active'))
        .limit(1);

  if (!company) {
    throw new Error(
      requestedCompanyId
        ? `Company not found: ${requestedCompanyId}`
        : 'No active company found. Pass a company ID as the first argument.',
    );
  }

  const now = new Date();
  await db
    .insert(employeesTable)
    .values(
      demoEmployees.map(([fullName, email, employmentStatus, hiredAt], index) => ({
        id: `demo-employee-${String(index + 1).padStart(2, '0')}`,
        companyId: company.id,
        fullName,
        documentType: 'cedula',
        documentNumber: `DEMO${String(index + 1).padStart(8, '0')}`,
        email,
        employmentStatus,
        hiredAt: new Date(`${hiredAt}T12:00:00.000Z`),
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: employeesTable.id });

  console.log(`Seeded ${demoEmployees.length} demo employees for company ${company.id}.`);
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
