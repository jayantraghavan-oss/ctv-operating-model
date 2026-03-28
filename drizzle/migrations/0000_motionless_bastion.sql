CREATE TABLE `user` (
	`id` varchar(255) NOT NULL,
	`open_id` varchar(255) NOT NULL,
	`name` text,
	`avatar_url` text,
	`role` enum('admin','user') NOT NULL DEFAULT 'user',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_open_id_unique` UNIQUE(`open_id`)
);
