import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ScrollableTextboxProps {
  value: string;
  maxHeight: number;
  maxWidth: number;
  textColor?: string;
  dimColor?: string;
  borderColor: string;
  isActive?: boolean;
  onScroll?: (offset: number) => void;
}

export function ScrollableTextbox({
  value,
  maxHeight,
  maxWidth,
  textColor = 'white',
  dimColor = 'gray',
  borderColor,
  isActive = false,
  onScroll,
}: ScrollableTextboxProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((input, key) => {
    if (!isActive) return;

    // Page Up or Ctrl+P to scroll up
    if (key.pageUp || (key.ctrl && input === 'p')) {
      setScrollOffset(prev => Math.max(0, prev - maxHeight));
      return;
    }

    // Page Down or Ctrl+N to scroll down
    if (key.pageDown || (key.ctrl && input === 'n')) {
      const lines = value.split('\n');
      const maxOffset = Math.max(0, lines.length - maxHeight);
      setScrollOffset(prev => Math.min(maxOffset, prev + maxHeight));
      return;
    }
  });

  // Split by newlines
  const lines = value.split('\n');

  const wrappedLines: string[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      wrappedLines.push('');
    } else {
      // Wrap long lines based on maxWidth
      let remaining = line;
      while (remaining.length > maxWidth - 2) {
        wrappedLines.push(remaining.substring(0, maxWidth - 2));
        remaining = remaining.substring(maxWidth - 2);
      }
      if (remaining.length > 0) {
        wrappedLines.push(remaining);
      }
    }
  }

  // Default to one empty line
  if (wrappedLines.length === 0) {
    wrappedLines.push('');
  }

  const contentHeight = Math.min(maxHeight, wrappedLines.length);
  const visibleLines = wrappedLines.slice(scrollOffset, scrollOffset + contentHeight);

  // Pad visible lines to fill the space
  while (visibleLines.length < contentHeight) {
    visibleLines.push('');
  }

  const hasMoreBelow = scrollOffset + contentHeight < wrappedLines.length;
  const hasMoreAbove = scrollOffset > 0;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={borderColor} width={maxWidth} height={maxHeight + 2}>
      {visibleLines.map((line, i) => (
        <Box key={i} width={maxWidth - 2}>
          <Text color={textColor}>{line.padEnd(maxWidth - 2)}</Text>
        </Box>
      ))}
      {(hasMoreAbove || hasMoreBelow) && (
        <Box width={maxWidth - 2}>
          <Text color={dimColor}>
            {hasMoreAbove ? '▲' : ' '}
            {wrappedLines.length > contentHeight ? `${scrollOffset + 1}-${Math.min(scrollOffset + contentHeight, wrappedLines.length)}/${wrappedLines.length}` : ''}
            {hasMoreBelow ? '▼' : ' '}
          </Text>
        </Box>
      )}
    </Box>
  );
}
