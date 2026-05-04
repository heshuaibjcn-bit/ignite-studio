-- Add rich storyboard fields: angle, movement, atmosphere, video_prompt, bgm_prompt, sound_effect
ALTER TABLE `storyboards` ADD `angle` text;
ALTER TABLE `storyboards` ADD `movement` text;
ALTER TABLE `storyboards` ADD `atmosphere` text;
ALTER TABLE `storyboards` ADD `video_prompt` text;
ALTER TABLE `storyboards` ADD `bgm_prompt` text;
ALTER TABLE `storyboards` ADD `sound_effect` text;
