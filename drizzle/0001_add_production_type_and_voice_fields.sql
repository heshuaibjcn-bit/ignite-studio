-- Add production_type column to projects (narrative_drama | narrated_image | commentary_mix)
ALTER TABLE `projects` ADD `production_type` text DEFAULT 'narrative_drama' NOT NULL;

-- Add voice provider and sample URL to characters
ALTER TABLE `characters` ADD `voice_provider` text;
ALTER TABLE `characters` ADD `voice_sample_url` text;
