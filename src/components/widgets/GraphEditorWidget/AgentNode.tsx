import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import styles from './GraphEditor.module.scss';
import {
  AgentNodeData,
  SOURCE_HANDLE_FALSE,
  SOURCE_HANDLE_PLAIN,
  SOURCE_HANDLE_TRUE,
} from './types';

/**
 * Node data enriched at render time with display-only fields (labels,
 * instruction lookups, entry-point flag, rename callback).
 */
export interface AgentNodeDisplayData extends AgentNodeData {
  typeLabel: string;
  /** Resolved instruction name when the config references one. */
  instructionName: string | null;
  /** Config carries a legacy inline system_prompt (and no instruction_id). */
  hasInlinePrompt: boolean;
  isEntry: boolean;
  editable: boolean;
  entryBadgeLabel: string;
  inlinePromptBadgeLabel: string;
  trueRouteLabel: string;
  falseRouteLabel: string;
  onRename: (nodeId: string, name: string) => void;
}

export type AgentDisplayNode = Node<AgentNodeDisplayData, 'agent'>;

/**
 * Canvas representation of an agent-graph node: name (inline editable on
 * double click), type badge, instruction summary, one target handle and
 * either one plain source handle or labeled true/false handles when the
 * node routes conditionally.
 */
export default function AgentNode({
  id,
  data,
  selected,
}: NodeProps<AgentDisplayNode>) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(data.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEditing = () => {
    if (!data.editable) return;
    setDraftName(data.name);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== data.name) data.onRename(id, trimmed);
  };

  const conditional = data.conditional;

  return (
    <div
      className={[
        styles.agentNode,
        selected ? styles.agentNodeSelected : '',
        data.isEntry ? styles.agentNodeEntry : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`graph-editor-node-${id}`}
    >
      {data.isEntry && (
        <span
          className={styles.entryBadge}
          data-testid={`graph-editor-node-${id}-entry-badge`}
        >
          {data.entryBadgeLabel}
        </span>
      )}
      <div className={styles.agentNodeHeader}>
        {editing ? (
          <input
            ref={inputRef}
            className={`${styles.agentNodeNameInput} nodrag`}
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
              e.stopPropagation();
            }}
            data-testid={`graph-editor-node-${id}-name-input`}
          />
        ) : (
          <span
            className={styles.agentNodeName}
            onDoubleClick={startEditing}
            title={data.name}
            data-testid={`graph-editor-node-${id}-name`}
          >
            {data.name}
          </span>
        )}
      </div>
      <span className={styles.typeBadge}>{data.typeLabel}</span>
      {data.instructionName ? (
        <span
          className={styles.instructionName}
          title={data.instructionName}
          data-testid={`graph-editor-node-${id}-instruction`}
        >
          {data.instructionName}
        </span>
      ) : data.hasInlinePrompt ? (
        <span
          className={styles.inlinePromptBadge}
          data-testid={`graph-editor-node-${id}-inline-prompt`}
        >
          {data.inlinePromptBadgeLabel}
        </span>
      ) : null}

      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
      />
      {conditional ? (
        <>
          <Handle
            type="source"
            id={SOURCE_HANDLE_TRUE}
            position={Position.Right}
            className={`${styles.handle} ${styles.handleTrue}`}
            style={{ top: '32%' }}
          />
          <span className={`${styles.handleLabel} ${styles.handleLabelTrue}`}>
            {data.trueRouteLabel}
          </span>
          <Handle
            type="source"
            id={SOURCE_HANDLE_FALSE}
            position={Position.Right}
            className={`${styles.handle} ${styles.handleFalse}`}
            style={{ top: '72%' }}
          />
          <span className={`${styles.handleLabel} ${styles.handleLabelFalse}`}>
            {data.falseRouteLabel}
          </span>
        </>
      ) : (
        <Handle
          type="source"
          id={SOURCE_HANDLE_PLAIN}
          position={Position.Right}
          className={styles.handle}
        />
      )}
    </div>
  );
}
