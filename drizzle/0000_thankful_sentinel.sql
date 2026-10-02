CREATE TABLE "project_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_folders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_folders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"folder_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"scene_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."project_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_folders_organization_id_idx" ON "project_folders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_organization_id_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_folder_id_idx" ON "projects" USING btree ("folder_id");--> statement-breakpoint
CREATE POLICY "project_folders_org_member" ON "project_folders" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (
    SELECT 1 FROM neon_auth.member AS m
    WHERE m."organizationId" = "project_folders"."organization_id"
      AND m."userId" = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM neon_auth.member AS m
    WHERE m."organizationId" = "project_folders"."organization_id"
      AND m."userId" = auth.uid()
  ));--> statement-breakpoint
CREATE POLICY "projects_org_member" ON "projects" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (
    SELECT 1 FROM neon_auth.member AS m
    WHERE m."organizationId" = "projects"."organization_id"
      AND m."userId" = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM neon_auth.member AS m
    WHERE m."organizationId" = "projects"."organization_id"
      AND m."userId" = auth.uid()
  ));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "project_folders" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "projects" TO "authenticated";
