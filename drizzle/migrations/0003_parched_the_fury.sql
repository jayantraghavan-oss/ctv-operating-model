ALTER TABLE `agent_runs` ADD `human_edited_output` text;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `human_prompt` text;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `approval_status` enum('pending','approved','rejected') DEFAULT 'pending';