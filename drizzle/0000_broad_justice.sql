CREATE TABLE `productions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`mode` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`config_snapshot` text,
	`template_ids` text,
	`default_voice_id` text,
	`owner_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`cover_asset_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`default_voice_id` text,
	`owner_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset_references` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`ref_type` text NOT NULL,
	`ref_id` text NOT NULL,
	`ref_field` text NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`production_id` text,
	`type` text NOT NULL,
	`source_type` text NOT NULL,
	`source_provider` text,
	`origin_job_id` text,
	`title` text,
	`mime_type` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`checksum` text,
	`local_path` text NOT NULL,
	`preview_url` text,
	`thumbnail_url` text,
	`width` integer,
	`height` integer,
	`duration_ms` integer,
	`fps` integer,
	`sample_rate` integer,
	`channels` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`version_no` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `agent_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT true NOT NULL,
	`model_config_id` text,
	`prompt_template` text,
	`tool_config` text,
	`extra_config` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_service_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`service_type` text NOT NULL,
	`provider` text NOT NULL,
	`model` text,
	`api_base` text,
	`api_key_encrypted` text,
	`config_payload` text,
	`is_active` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_voices` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_voice_id` text NOT NULL,
	`name` text NOT NULL,
	`gender` text,
	`language` text,
	`style` text,
	`preview_asset_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 100 NOT NULL,
	`extra_payload` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`payload` text,
	`version_no` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`seq` integer NOT NULL,
	`text` text NOT NULL,
	`optimized_text` text,
	`start_ms` integer,
	`end_ms` integer,
	`image_asset_id` text,
	`visual_items` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `talking_head_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`export_type` text NOT NULL,
	`job_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `talking_head_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`production_id` text NOT NULL,
	`title` text NOT NULL,
	`original_content` text NOT NULL,
	`optimized_content` text,
	`voice_id` text,
	`audio_asset_id` text,
	`subtitle_asset_id` text,
	`preview_video_asset_id` text,
	`final_video_asset_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`content_status` text DEFAULT 'pending' NOT NULL,
	`optimize_status` text DEFAULT 'pending' NOT NULL,
	`tts_status` text DEFAULT 'pending' NOT NULL,
	`image_status` text DEFAULT 'pending' NOT NULL,
	`subtitle_status` text DEFAULT 'pending' NOT NULL,
	`compose_status` text DEFAULT 'pending' NOT NULL,
	`export_status` text DEFAULT 'pending' NOT NULL,
	`config_snapshot` text,
	`current_job_id` text,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clip_sequence_items` (
	`id` text PRIMARY KEY NOT NULL,
	`remix_task_id` text NOT NULL,
	`clip_id` text NOT NULL,
	`seq` integer NOT NULL,
	`source_material_id` text NOT NULL,
	`trim_in_ms` integer,
	`trim_out_ms` integer,
	`playback_rate` integer,
	`keep_original_audio` integer DEFAULT false NOT NULL,
	`mute_original_audio` integer DEFAULT false NOT NULL,
	`transition_after` text,
	`overlay_subtitle_mode` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clips` (
	`id` text PRIMARY KEY NOT NULL,
	`source_material_id` text NOT NULL,
	`version_no` integer DEFAULT 1 NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`summary` text,
	`transcript` text,
	`tags_json` text,
	`score` integer,
	`confidence` integer,
	`split_method` text NOT NULL,
	`manual_adjusted` integer DEFAULT false NOT NULL,
	`preview_asset_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `remix_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`remix_task_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`export_type` text NOT NULL,
	`job_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `remix_task_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`remix_task_id` text NOT NULL,
	`source_material_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `remix_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`production_id` text NOT NULL,
	`title` text NOT NULL,
	`narration_script` text,
	`final_video_asset_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`material_status` text DEFAULT 'pending' NOT NULL,
	`split_status` text DEFAULT 'pending' NOT NULL,
	`sequence_status` text DEFAULT 'pending' NOT NULL,
	`narration_status` text DEFAULT 'pending' NOT NULL,
	`tts_status` text DEFAULT 'pending' NOT NULL,
	`subtitle_status` text DEFAULT 'pending' NOT NULL,
	`preview_status` text DEFAULT 'pending' NOT NULL,
	`final_compose_status` text DEFAULT 'pending' NOT NULL,
	`config_snapshot` text,
	`current_job_id` text,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`production_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`title` text NOT NULL,
	`import_type` text NOT NULL,
	`source_url` text,
	`duration_ms` integer,
	`width` integer,
	`height` integer,
	`fps` integer,
	`audio_tracks` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`gender` text,
	`age_desc` text,
	`personality` text,
	`appearance_prompt` text,
	`voice_id` text,
	`image_asset_id` text,
	`extra_payload` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `episode_characters` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`character_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_episode_characters_uniq` ON `episode_characters` (`episode_id`,`character_id`);--> statement-breakpoint
CREATE TABLE `episode_scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`scene_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_episode_scenes_uniq` ON `episode_scenes` (`episode_id`,`scene_id`);--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`production_id` text NOT NULL,
	`episode_no` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`script_content` text,
	`final_video_asset_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_validate_status` text DEFAULT 'pending' NOT NULL,
	`script_rewrite_status` text DEFAULT 'pending' NOT NULL,
	`character_scene_extract_status` text DEFAULT 'pending' NOT NULL,
	`voice_assign_status` text DEFAULT 'pending' NOT NULL,
	`storyboard_generate_status` text DEFAULT 'pending' NOT NULL,
	`storyboard_review_status` text DEFAULT 'pending' NOT NULL,
	`character_image_generate_status` text DEFAULT 'pending' NOT NULL,
	`scene_image_generate_status` text DEFAULT 'pending' NOT NULL,
	`frame_image_generate_status` text DEFAULT 'pending' NOT NULL,
	`video_generate_status` text DEFAULT 'pending' NOT NULL,
	`video_review_status` text DEFAULT 'pending' NOT NULL,
	`shot_compose_status` text DEFAULT 'pending' NOT NULL,
	`episode_merge_status` text DEFAULT 'pending' NOT NULL,
	`export_finalize_status` text DEFAULT 'pending' NOT NULL,
	`waiting_review_step` text,
	`current_job_id` text,
	`config_snapshot` text,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `image_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`episode_id` text,
	`storyboard_id` text,
	`target_type` text NOT NULL,
	`target_id` text,
	`prompt_text` text,
	`provider` text,
	`model` text,
	`job_id` text,
	`asset_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`location_desc` text,
	`time_desc` text,
	`style_desc` text,
	`image_asset_id` text,
	`extra_payload` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `storyboards` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`seq` integer NOT NULL,
	`title` text,
	`shot_type` text,
	`visual_desc` text NOT NULL,
	`dialogue` text,
	`action_desc` text,
	`duration_sec` integer,
	`scene_id` text,
	`prompt_text` text,
	`selected_image_asset_id` text,
	`selected_video_asset_id` text,
	`composed_video_asset_id` text,
	`image_candidate_asset_ids` text,
	`video_candidate_asset_ids` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_storyboards_episode` ON `storyboards` (`episode_id`);--> statement-breakpoint
CREATE TABLE `video_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`episode_id` text,
	`storyboard_id` text,
	`image_asset_id` text,
	`prompt_text` text,
	`provider` text,
	`model` text,
	`job_id` text,
	`asset_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`error_code` text,
	`error_message` text,
	`duration_ms` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `video_merges` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`input_asset_ids` text,
	`output_asset_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `batch_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`biz_type` text NOT NULL,
	`production_id` text,
	`total_count` integer DEFAULT 0 NOT NULL,
	`submitted_count` integer DEFAULT 0 NOT NULL,
	`running_count` integer DEFAULT 0 NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`cancelled_count` integer DEFAULT 0 NOT NULL,
	`paused_reason` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_events` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`step_id` text,
	`event_type` text NOT NULL,
	`payload` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_job_events_job` ON `job_events` (`job_id`);--> statement-breakpoint
CREATE TABLE `job_step_items` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`step_id` text NOT NULL,
	`item_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`execution_state` text DEFAULT 'normal' NOT NULL,
	`provider_name` text,
	`provider_task_id` text,
	`input_snapshot` text,
	`output_snapshot` text,
	`error_code` text,
	`error_message` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`started_at` text,
	`finished_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_job_step_items_job_step` ON `job_step_items` (`job_id`,`step_id`);--> statement-breakpoint
CREATE INDEX `idx_job_step_items_item` ON `job_step_items` (`job_id`,`step_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `idx_job_step_items_provider` ON `job_step_items` (`provider_task_id`);--> statement-breakpoint
CREATE TABLE `job_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`step_code` text NOT NULL,
	`step_name` text NOT NULL,
	`step_order` integer NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`execution_state` text DEFAULT 'normal' NOT NULL,
	`provider_name` text,
	`provider_task_id` text,
	`input_snapshot` text,
	`output_snapshot` text,
	`error_code` text,
	`error_message` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`started_at` text,
	`finished_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_job_steps_job` ON `job_steps` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_job_steps_provider` ON `job_steps` (`provider_task_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`production_id` text,
	`biz_type` text NOT NULL,
	`biz_id` text NOT NULL,
	`run_type` text NOT NULL,
	`trigger_source` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`current_step` text,
	`priority` integer DEFAULT 100 NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`idempotency_key` text,
	`parent_batch_id` text,
	`created_by` text,
	`error_code` text,
	`error_message` text,
	`cancel_requested` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`started_at` text,
	`finished_at` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_status` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_jobs_biz` ON `jobs` (`biz_type`,`biz_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_idempotency` ON `jobs` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `api_call_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key_id` text,
	`request_id` text NOT NULL,
	`skill_name` text,
	`path` text NOT NULL,
	`method` text NOT NULL,
	`biz_type` text,
	`biz_id` text,
	`job_id` text,
	`status_code` integer NOT NULL,
	`success` integer DEFAULT false NOT NULL,
	`duration_ms` integer,
	`error_code` text,
	`request_payload` text,
	`response_payload` text,
	`client_ip` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_api_call_logs_key` ON `api_call_logs` (`api_key_id`);--> statement-breakpoint
CREATE INDEX `idx_api_call_logs_request` ON `api_call_logs` (`request_id`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`daily_quota` integer DEFAULT 500 NOT NULL,
	`per_minute_limit` integer DEFAULT 60 NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_api_keys_prefix` ON `api_keys` (`key_prefix`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`details` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_target` ON `audit_logs` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor` ON `audit_logs` (`actor_type`,`actor_id`);--> statement-breakpoint
CREATE TABLE `text_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`biz_type` text NOT NULL,
	`biz_id` text NOT NULL,
	`field_name` text NOT NULL,
	`version_no` integer NOT NULL,
	`content` text NOT NULL,
	`source_type` text NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_text_versions_biz` ON `text_versions` (`biz_type`,`biz_id`,`field_name`);