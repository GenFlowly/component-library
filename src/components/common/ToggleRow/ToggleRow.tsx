import React from 'react';
import Switch from '../Switch/Switch';
import SettingsRow from '../SettingsCard/SettingsRow';

export interface ToggleRowProps {
  /** Row label; also the switch's accessible name. */
  label: string;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'data-testid'?: string;
}

/** A SettingsRow whose control is an on/off switch. */
export default function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  'data-testid': testId,
}: ToggleRowProps): React.ReactElement {
  return (
    <SettingsRow
      label={label}
      description={description}
      stackOnNarrow={false}
      action={
        <Switch
          checked={checked}
          onChange={onChange}
          label={label}
          disabled={disabled}
          data-testid={testId}
        />
      }
    />
  );
}
