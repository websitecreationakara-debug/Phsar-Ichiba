CREATE TABLE `product_ratings` (
	`product_id` text NOT NULL,
	`user_id` text NOT NULL,
	`stars` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`product_id`, `user_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
