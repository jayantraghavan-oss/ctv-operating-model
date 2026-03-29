CREATE TABLE `workflow_sessions` (
	`id` varchar(64) NOT NULL,
	`name` varchar(500) NOT NULL,
	`description` text,
	`query_type` enum('preset','custom') NOT NULL,
	`custom_query` text,
	`agent_count` int NOT NULL,
	`completed_count` int NOT NULL,
	`total_duration_ms` int,
	`compiled_output` text NOT NULL,
	`node_details` text,
	`user_id` varchar(255),
	`started_at` bigint NOT NULL,
	`completed_at` bigint,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_sessions_id` PRIMARY KEY(`id`)
);
