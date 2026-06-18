import React from 'react';

export interface ElementRenderer<T = unknown> {
  render(data: T, w: number, h: number): React.ReactNode;
}
