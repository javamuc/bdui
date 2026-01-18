import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { createIssue } from '../bd/commands';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { VALIDATION, validateTitle, PRIORITY_LABELS } from '../utils/constants';
import { ScrollableTextbox } from './ScrollableTextbox';

interface CreateIssueFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type FormField = 'title' | 'priority' | 'type' | 'description' | 'assignee' | 'labels';

const ISSUE_TYPES: Array<'task' | 'epic' | 'bug' | 'feature' | 'chore'> = ['task', 'epic', 'bug', 'feature', 'chore'];

export function CreateIssueForm({ onClose, onSuccess }: CreateIssueFormProps) {
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const showToast = useBeadsStore(state => state.showToast);
  const showConfirm = useBeadsStore(state => state.showConfirm);
  const showConfirmDialog = useBeadsStore(state => state.showConfirmDialog);
  const theme = getTheme(currentTheme);

  const [currentField, setCurrentField] = useState<FormField>('title');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 2,
    issueType: 'task' as 'task' | 'epic' | 'bug' | 'feature' | 'chore',
    assignee: '',
    labels: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reordered: title -> priority -> type -> description -> assignee -> labels
  const fields: FormField[] = ['title', 'priority', 'type', 'description', 'assignee', 'labels'];
  const currentFieldIndex = fields.indexOf(currentField);

  // Real-time validation
  const titleValidation = validateTitle(formData.title);
  const titleCharCount = formData.title.length;

  useInput((input, key) => {
    // Don't handle input when confirm dialog is open
    if (showConfirmDialog) return;

    // ESC to close
    if (key.escape) {
      onClose();
      return;
    }

    // Tab to next field
    if (key.tab && !key.shift) {
      if (currentFieldIndex < fields.length - 1) {
        setCurrentField(fields[currentFieldIndex + 1]);
      }
      return;
    }

    // Shift+Tab to previous field
    if (key.tab && key.shift) {
      if (currentFieldIndex > 0) {
        setCurrentField(fields[currentFieldIndex - 1]);
      }
      return;
    }

    // Enter to submit (with confirmation)
    if (key.return && !isSubmitting) {
      if (!titleValidation.valid) {
        setError(titleValidation.error || 'Invalid title');
        return;
      }
      // Show confirmation dialog
      showConfirm(
        'Create Issue',
        `Create issue "${formData.title.substring(0, 40)}${formData.title.length > 40 ? '...' : ''}"?`,
        handleSubmit
      );
      return;
    }

    // Handle input for text fields
    if (currentField === 'title' || currentField === 'description' || currentField === 'assignee' || currentField === 'labels') {
      if (key.backspace || key.delete) {
        setFormData({
          ...formData,
          [currentField]: formData[currentField].slice(0, -1),
        });
        setError(null);
        return;
      }

      if (!key.ctrl && !key.meta && input) {
        const currentValue = formData[currentField];
        const maxLength = currentField === 'title'
          ? VALIDATION.title.maxLength
          : currentField === 'description'
          ? VALIDATION.description.maxLength
          : VALIDATION.assignee.maxLength;

        if (currentValue.length < maxLength) {
          setFormData({
            ...formData,
            [currentField]: currentValue + input,
          });
          setError(null);
        }
      }
      return;
    }

    // Navigation for priority field
    if (currentField === 'priority') {
      if (key.upArrow && formData.priority < 4) {
        setFormData({ ...formData, priority: formData.priority + 1 });
      } else if (key.downArrow && formData.priority > 0) {
        setFormData({ ...formData, priority: formData.priority - 1 });
      }
      return;
    }

    // Navigation for type field
    if (currentField === 'type') {
      const currentIndex = ISSUE_TYPES.indexOf(formData.issueType);
      if (key.upArrow && currentIndex > 0) {
        setFormData({ ...formData, issueType: ISSUE_TYPES[currentIndex - 1] });
      } else if (key.downArrow && currentIndex < ISSUE_TYPES.length - 1) {
        setFormData({ ...formData, issueType: ISSUE_TYPES[currentIndex + 1] });
      }
      return;
    }
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse labels from comma-separated input
      const labels = formData.labels
        .split(',')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      await createIssue({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        issueType: formData.issueType,
        assignee: formData.assignee.trim() || undefined,
        labels: labels.length > 0 ? labels : undefined,
      });

      showToast(`Issue created: ${formData.title.substring(0, 30)}${formData.title.length > 30 ? '...' : ''}`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue');
      showToast('Failed to create issue', 'error');
      setIsSubmitting(false);
    }
  };

  const primaryColor = theme.colors.primary;

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box justifyContent="space-between">
          <Text bold color={primaryColor}>
            Create New Issue
          </Text>
          <Text dimColor>
            {terminalWidth}x{terminalHeight}
          </Text>
        </Box>
        <Text dimColor>
          ESC to cancel | Tab/Shift+Tab to navigate fields | Enter to submit
        </Text>
      </Box>

      {/* Form Content */}
      <Box flexDirection="column" padding={1} borderStyle="single" borderColor={primaryColor} flexGrow={1}>
        {/* Title - with character count */}
        <Box flexDirection="column" marginBottom={2}>
          <Box justifyContent="space-between">
            <Text color={currentField === 'title' ? primaryColor : theme.colors.text} bold>
              Title * {currentField === 'title' && <Text color={primaryColor}>(editing)</Text>}
            </Text>
            <Text color={titleCharCount > VALIDATION.title.maxLength * 0.9 ? theme.colors.warning : theme.colors.textDim}>
              {titleCharCount}/{VALIDATION.title.maxLength}
            </Text>
          </Box>
          <Box
            borderStyle="single"
            borderColor={
              currentField === 'title'
                ? (titleValidation.valid || formData.title === '' ? primaryColor : theme.colors.error)
                : theme.colors.border
            }
            paddingX={1}
          >
            <Text>{formData.title || <Text color={theme.colors.textDim}>(enter issue title)</Text>}</Text>
            {currentField === 'title' && <Text color={theme.colors.textDim}>|</Text>}
          </Box>
          {currentField === 'title' && !titleValidation.valid && formData.title !== '' && (
            <Text color={theme.colors.error}>{titleValidation.error}</Text>
          )}
        </Box>

        {/* Priority and Type in a row */}
        <Box gap={2} marginBottom={1}>
          {/* Priority */}
          <Box flexDirection="column" width="50%">
            <Text color={currentField === 'priority' ? primaryColor : theme.colors.text} bold>
              Priority {currentField === 'priority' && '↑↓'}
            </Text>
            <Box borderStyle="single" borderColor={currentField === 'priority' ? primaryColor : theme.colors.border} paddingX={1}>
              <Text>P{formData.priority}</Text>
            </Box>
          </Box>

          {/* Issue Type */}
          <Box flexDirection="column" width="50%">
            <Text color={currentField === 'type' ? primaryColor : theme.colors.text} bold>
              Type {currentField === 'type' && '↑↓'}
            </Text>
            <Box borderStyle="single" borderColor={currentField === 'type' ? primaryColor : theme.colors.border} paddingX={1}>
              <Text>{formData.issueType}</Text>
            </Box>
          </Box>
        </Box>

        {/* Description - takes up remaining space */}
        <Box flexDirection="column" marginBottom={1} flexGrow={1}>
          <Box justifyContent="space-between">
            <Text color={currentField === 'description' ? primaryColor : theme.colors.text} bold>
              Description {currentField === 'description' && <Text color={primaryColor}>(editing)</Text>}
            </Text>
            <Text color={theme.colors.textDim}>
              {formData.description.length}/{VALIDATION.description.maxLength}
            </Text>
          </Box>
          {currentField === 'description' && (
            <Text color={theme.colors.textDim} dimColor>
              Page Up/Ctrl+P: scroll up | Page Down/Ctrl+N: scroll down | Type to edit
            </Text>
          )}
          <ScrollableTextbox
            value={formData.description || '(optional)'}
            maxHeight={28}
            maxWidth={Math.max(40, terminalWidth - 6)}
            textColor={currentField === 'description' ? primaryColor : theme.colors.text}
            dimColor={theme.colors.textDim}
            borderColor={currentField === 'description' ? primaryColor : theme.colors.border}
            isActive={currentField === 'description'}
          />
        </Box>

        {/* Assignee and Labels in a row */}
        <Box gap={2} marginBottom={1}>
          {/* Assignee */}
          <Box flexDirection="column" width="50%">
            <Text color={currentField === 'assignee' ? primaryColor : theme.colors.text} bold>
              Assignee {currentField === 'assignee' && <Text color={primaryColor}>(editing)</Text>}
            </Text>
            <Box borderStyle="single" borderColor={currentField === 'assignee' ? primaryColor : theme.colors.border} paddingX={1}>
              <Text>{formData.assignee || <Text color={theme.colors.textDim}>optional</Text>}</Text>
              {currentField === 'assignee' && <Text color={theme.colors.textDim}>|</Text>}
            </Box>
          </Box>

          {/* Labels */}
          <Box flexDirection="column" width="50%">
            <Text color={currentField === 'labels' ? primaryColor : theme.colors.text} bold>
              Labels {currentField === 'labels' && <Text color={primaryColor}>(editing)</Text>}
            </Text>
            <Box borderStyle="single" borderColor={currentField === 'labels' ? primaryColor : theme.colors.border} paddingX={1}>
              <Text>{formData.labels || <Text color={theme.colors.textDim}>optional</Text>}</Text>
              {currentField === 'labels' && <Text color={theme.colors.textDim}>|</Text>}
            </Box>
          </Box>
        </Box>

        {/* Status messages */}
        {error && (
          <Box marginTop={1} borderStyle="single" borderColor={theme.colors.error} paddingX={1}>
            <Text color={theme.colors.error} bold>Error: </Text>
            <Text color={theme.colors.error}>{error}</Text>
          </Box>
        )}

        {isSubmitting && (
          <Box marginTop={1}>
            <Text color={theme.colors.warning}>Creating issue...</Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor={theme.colors.border} paddingX={1}>
        <Box justifyContent="space-between">
          <Text dimColor>
            Tab/Shift+Tab: Navigate | up/down: Change values | Enter: Submit | ESC: Cancel
          </Text>
          <Text color={primaryColor}>
            Field {currentFieldIndex + 1}/{fields.length}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
