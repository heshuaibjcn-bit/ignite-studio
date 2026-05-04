/**
 * Agent Configs API
 * GET  — list all agent configs
 * POST — create or update an agent config
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { agentConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const configs = await db.select().from(agentConfigs);
    return NextResponse.json({ configs });
  } catch (error) {
    logger.error({ error }, 'Failed to list agent configs');
    return NextResponse.json(
      { error: 'Failed to list agent configs' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      agentType,
      name,
      description,
      enabled,
      model,
      temperature,
      maxTokens,
      systemPrompt,
    } = body;

    if (!agentType) {
      return NextResponse.json(
        { error: 'agentType is required' },
        { status: 400 },
      );
    }

    const db = getDb();

    // Upsert: check if config exists for this agent type
    const existing = await db
      .select()
      .from(agentConfigs)
      .where(eq(agentConfigs.agentType, agentType));

    const now = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    if (existing.length > 0) {
      // Update existing config
      const updateData: Record<string, unknown> = { updatedAt: now };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (model !== undefined) updateData.model = model;
      if (temperature !== undefined) updateData.temperature = temperature;
      if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
      if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;

      await db
        .update(agentConfigs)
        .set(updateData)
        .where(eq(agentConfigs.agentType, agentType));

      const updated = await db
        .select()
        .from(agentConfigs)
        .where(eq(agentConfigs.agentType, agentType));

      logger.info({ agentType }, 'Agent config updated');
      return NextResponse.json({ config: updated[0] });
    } else {
      // Create new config
      const { nanoid } = await import('nanoid');
      const id = nanoid(12);
      await db.insert(agentConfigs).values({
        id,
        agentType,
        name: name || agentType,
        description: description || null,
        enabled: enabled ?? true,
        model: model || null,
        temperature: temperature ?? null,
        maxTokens: maxTokens ?? null,
        systemPrompt: systemPrompt || null,
        createdAt: now,
        updatedAt: now,
      });

      const created = await db
        .select()
        .from(agentConfigs)
        .where(eq(agentConfigs.id, id));

      logger.info({ agentType, id }, 'Agent config created');
      return NextResponse.json({ config: created[0] }, { status: 201 });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to create/update agent config');
    return NextResponse.json(
      { error: 'Failed to create/update agent config' },
      { status: 500 },
    );
  }
}
