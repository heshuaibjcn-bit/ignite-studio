-- Add storyboard_characters junction table and tts_audio_asset_id to storyboards
CREATE TABLE IF NOT EXISTS `storyboard_characters` (
  `storyboard_id` text NOT NULL,
  `character_id` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_storyboard_characters_pk` ON `storyboard_characters` (`storyboard_id`,`character_id`);
ALTER TABLE `storyboards` ADD COLUMN `tts_audio_asset_id` text;
