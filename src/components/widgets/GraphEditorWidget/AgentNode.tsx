import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import styles from './GraphEditor.module.scss';
import { TYPE_COLOR_CSS_VAR } from './nodeTypeInfo';
import {
  AgentNodeData,
  SOURCE_HANDLE_FALSE,
  SOURCE_HANDLE_PLAIN,
  SOURCE_HANDLE_TRUE,
} from './types';

/** One labeled source handle of a conditionally routing node. */
export interface RouteHandleDisplay {
  /** Handle id (`route:<label>`). */
  id: string;
  /** Display text (i18n-mapped for true/false/default). */
  label: string;
}

/**
 * Node data enriched at render time with display-only fields (labels,
 * instruction lookups, entry-point flag, rename callback).
 */
export interface AgentNodeDisplayData extends AgentNodeData {
  typeLabel: string;
  /** Accent color of the node's type (left border + type-badge tint). */
  typeColor: string;
  /** Resolved instruction name when the config references one. */
  instructionName: string | null;
  isEntry: boolean;
  editable: boolean;
  entryBadgeLabel: string;
  /** One entry per route label when the node routes conditionally. */
  routeHandles: RouteHandleDisplay[];
  onRename: (nodeId: string, name: string) => void;
}

export type AgentDisplayNode = Node<AgentNodeDisplayData, 'agent'>;

/**
 * Canvas representation of an agent-graph node: name (inline editable on
 * double click), type badge, instruction summary, one target handle and
 * either one plain source handle or one labeled source handle per route
 * (stacked vertically, evenly spaced) when the node routes conditionally.
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
  const routeHandles = conditional ? data.routeHandles : [];
  // Keep enough vertical room for the stacked route handles/labels.
  const minHeight =
    routeHandles.length > 2
      ? `${routeHandles.length * 1.4 + 1.2}rem`
      : undefined;

  // The stylesheet derives the left accent border and the type-badge tint
  // from this variable.
  const nodeStyle = {
    [TYPE_COLOR_CSS_VAR]: data.typeColor,
    ...(minHeight ? { minHeight } : undefined),
  } as React.CSSProperties;

  return (
    <div
      className={[
        styles.agentNode,
        selected ? styles.agentNodeSelected : '',
        data.isEntry ? styles.agentNodeEntry : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={nodeStyle}
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
      ) : null}

      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
      />
      {conditional ? (
        routeHandles.map((route, index) => {
          // Evenly spaced along the node's right edge, top → bottom.
          const top = ((index + 1) / (routeHandles.length + 1)) * 100;
          const colorClass =
            route.id === SOURCE_HANDLE_TRUE
              ? styles.handleTrue
              : route.id === SOURCE_HANDLE_FALSE
                ? styles.handleFalse
                : '';
          return (
            <React.Fragment key={route.id}>
              <Handle
                type="source"
                id={route.id}
                position={Position.Right}
                className={`${styles.handle} ${colorClass}`.trim()}
                style={{ top: `${top}%` }}
              />
              <span
                className={styles.handleLabel}
                style={{ top: `calc(${top}% - 0.3125rem)` }}
              >
                {route.label}
              </span>
            </React.Fragment>
          );
        })
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
