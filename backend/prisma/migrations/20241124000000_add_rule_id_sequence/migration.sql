-- CreateTable for Sequence counter
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT NOT NULL DEFAULT 'DQ',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for unique sequence name
CREATE UNIQUE INDEX "sequences_name_key" ON "sequences"("name");

-- Add ruleId column to rules table
ALTER TABLE "rules" ADD COLUMN "ruleId" TEXT;

-- Generate ruleIds for existing rules
DO $$
DECLARE
    rule_record RECORD;
    counter INTEGER := 1;
BEGIN
    FOR rule_record IN SELECT id FROM rules ORDER BY "createdAt" ASC
    LOOP
        UPDATE rules SET "ruleId" = 'DQ-' || LPAD(counter::TEXT, 7, '0') WHERE id = rule_record.id;
        counter := counter + 1;
    END LOOP;

    -- Insert sequence with current counter value
    INSERT INTO sequences (id, name, "currentValue", prefix, "updatedAt")
    VALUES (gen_random_uuid()::TEXT, 'rule_id', counter - 1, 'DQ', NOW());
END $$;

-- Make ruleId NOT NULL and UNIQUE after populating
ALTER TABLE "rules" ALTER COLUMN "ruleId" SET NOT NULL;
CREATE UNIQUE INDEX "rules_ruleId_key" ON "rules"("ruleId");
