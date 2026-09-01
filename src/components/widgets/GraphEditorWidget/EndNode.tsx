import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import styles from './GraphEditor.module.scss';

export interface EndNodeDisplayData extends Record<string, unknown> {
  label: string;
}

export type EndDisplayNode = Node<EndNodeDisplayData, 'end'>;

/**
 * The permanent terminal node of every graph (`__end__`). Target-only:
 * edges may point to it but never leave it, and it cannot be deleted.
 */
export default function EndNode({ data }: NodeProps<EndDisplayNode>) {
  return (
    <div className={styles.endNode} data-testid="graph-editor-node-end">
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
      />
      {data.label}
    </div>
  );
}
