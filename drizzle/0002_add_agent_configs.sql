-- Add model/temperature/systemPrompt columns to existing agent_configs table
ALTER TABLE `agent_configs` ADD `model` text;
ALTER TABLE `agent_configs` ADD `temperature` real;
ALTER TABLE `agent_configs` ADD `max_tokens` integer;
ALTER TABLE `agent_configs` ADD `system_prompt` text;
