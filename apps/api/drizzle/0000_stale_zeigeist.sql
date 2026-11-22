CREATE TABLE "approver_assignments" (
	"demo_space_id" uuid NOT NULL,
	"request_type_id" smallint NOT NULL,
	"approver_id" uuid NOT NULL,
	CONSTRAINT "approver_assignments_demo_space_id_request_type_id_pk" PRIMARY KEY("demo_space_id","request_type_id")
);
--> statement-breakpoint
CREATE TABLE "demo_spaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"hard_expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"ended_at" timestamp with time zone,
	"request_seq" integer NOT NULL,
	"requests_created" integer NOT NULL,
	CONSTRAINT "demo_spaces_status_check" CHECK ("demo_spaces"."status" in ('active', 'ended'))
);
--> statement-breakpoint
CREATE TABLE "request_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"demo_space_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "request_events_type_check" CHECK ("request_events"."type" in ('created', 'approved', 'rejected', 'assigned', 'released', 'completed')),
	CONSTRAINT "request_events_from_status_check" CHECK ("request_events"."from_status" in ('pending_approval', 'rejected', 'approved', 'in_progress', 'completed')),
	CONSTRAINT "request_events_to_status_check" CHECK ("request_events"."to_status" in ('pending_approval', 'rejected', 'approved', 'in_progress', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "request_types" (
	"id" smallint PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"demo_space_id" uuid NOT NULL,
	"code" text NOT NULL,
	"request_type_id" smallint NOT NULL,
	"requester_id" uuid NOT NULL,
	"approver_id" uuid NOT NULL,
	"assignee_id" uuid,
	"software_name" text NOT NULL,
	"access_level" text NOT NULL,
	"access_detail" text,
	"justification" text NOT NULL,
	"needed_by" date,
	"comments" text,
	"status" text NOT NULL,
	"decision_comment" text,
	"decided_at" timestamp with time zone,
	"completion_note" text,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"is_sample" boolean NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "requests_space_code_unique" UNIQUE("demo_space_id","code"),
	CONSTRAINT "requests_space_id_unique" UNIQUE("demo_space_id","id"),
	CONSTRAINT "requests_access_level_check" CHECK ("requests"."access_level" in ('read', 'edit', 'admin', 'other')),
	CONSTRAINT "requests_status_check" CHECK ("requests"."status" in ('pending_approval', 'rejected', 'approved', 'in_progress', 'completed')),
	CONSTRAINT "requests_status_assignee_check" CHECK (("requests"."status" = 'in_progress') = ("requests"."assignee_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"demo_space_id" uuid NOT NULL,
	"active_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"demo_space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role"),
	CONSTRAINT "user_roles_role_check" CHECK ("user_roles"."role" in ('requester', 'approver', 'it_agent'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"demo_space_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"job_title" text NOT NULL,
	"demo_identity" text,
	CONSTRAINT "users_space_id_unique" UNIQUE("demo_space_id","id"),
	CONSTRAINT "users_space_identity_unique" UNIQUE("demo_space_id","demo_identity"),
	CONSTRAINT "users_demo_identity_check" CHECK ("users"."demo_identity" in ('employee', 'approver', 'it_agent'))
);
--> statement-breakpoint
ALTER TABLE "approver_assignments" ADD CONSTRAINT "approver_assignments_demo_space_id_demo_spaces_id_fk" FOREIGN KEY ("demo_space_id") REFERENCES "public"."demo_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approver_assignments" ADD CONSTRAINT "approver_assignments_request_type_id_request_types_id_fk" FOREIGN KEY ("request_type_id") REFERENCES "public"."request_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approver_assignments" ADD CONSTRAINT "approver_assignments_space_approver_fk" FOREIGN KEY ("demo_space_id","approver_id") REFERENCES "public"."users"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_demo_space_id_demo_spaces_id_fk" FOREIGN KEY ("demo_space_id") REFERENCES "public"."demo_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_space_request_fk" FOREIGN KEY ("demo_space_id","request_id") REFERENCES "public"."requests"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_space_actor_fk" FOREIGN KEY ("demo_space_id","actor_id") REFERENCES "public"."users"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_demo_space_id_demo_spaces_id_fk" FOREIGN KEY ("demo_space_id") REFERENCES "public"."demo_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_request_type_id_request_types_id_fk" FOREIGN KEY ("request_type_id") REFERENCES "public"."request_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_space_requester_fk" FOREIGN KEY ("demo_space_id","requester_id") REFERENCES "public"."users"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_space_approver_fk" FOREIGN KEY ("demo_space_id","approver_id") REFERENCES "public"."users"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_space_assignee_fk" FOREIGN KEY ("demo_space_id","assignee_id") REFERENCES "public"."users"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_space_completed_by_fk" FOREIGN KEY ("demo_space_id","completed_by") REFERENCES "public"."users"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_demo_space_id_demo_spaces_id_fk" FOREIGN KEY ("demo_space_id") REFERENCES "public"."demo_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_space_active_user_fk" FOREIGN KEY ("demo_space_id","active_user_id") REFERENCES "public"."users"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_demo_space_id_demo_spaces_id_fk" FOREIGN KEY ("demo_space_id") REFERENCES "public"."demo_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_space_user_fk" FOREIGN KEY ("demo_space_id","user_id") REFERENCES "public"."users"("demo_space_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_demo_space_id_demo_spaces_id_fk" FOREIGN KEY ("demo_space_id") REFERENCES "public"."demo_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demo_spaces_hard_expires_at_idx" ON "demo_spaces" USING btree ("hard_expires_at");--> statement-breakpoint
CREATE INDEX "demo_spaces_last_seen_at_idx" ON "demo_spaces" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "request_events_request_created_idx" ON "request_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_space_status_idx" ON "requests" USING btree ("demo_space_id","status");--> statement-breakpoint
CREATE INDEX "requests_space_requester_idx" ON "requests" USING btree ("demo_space_id","requester_id");--> statement-breakpoint
CREATE INDEX "requests_space_approver_idx" ON "requests" USING btree ("demo_space_id","approver_id");
--> statement-breakpoint
INSERT INTO "request_types" ("id", "key", "name") VALUES (1, 'software_access', 'Software access');
