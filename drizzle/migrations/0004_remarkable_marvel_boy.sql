CREATE TABLE `agent_feedback` (
	`id` varchar(64) NOT NULL,
	`run_id` varchar(64) NOT NULL,
	`prompt_id` int NOT NULL,
	`module_id` int NOT NULL,
	`rating` enum('up','down') NOT NULL,
	`comment` text,
	`had_live_context` int DEFAULT 0,
	`live_data_sources` text,
	`user_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_feedback_id` PRIMARY KEY(`id`)
);
