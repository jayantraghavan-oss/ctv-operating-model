CREATE TABLE `agent_runs` (
	`id` varchar(64) NOT NULL,
	`prompt_id` int NOT NULL,
	`prompt_text` text NOT NULL,
	`module_id` int NOT NULL,
	`sub_module_name` varchar(255) NOT NULL,
	`agent_type` varchar(50) DEFAULT 'persistent',
	`owner` varchar(50) DEFAULT 'agent',
	`status` enum('running','completed','failed') NOT NULL,
	`output` text,
	`duration_ms` int,
	`started_at` bigint NOT NULL,
	`completed_at` bigint,
	`user_id` varchar(255),
	`scenario_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_runs_id` PRIMARY KEY(`id`)
);
