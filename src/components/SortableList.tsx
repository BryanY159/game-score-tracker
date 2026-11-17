import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { GripIcon } from './Icons';

/** A vertical list reordered by dragging the grip (setup turn order, Monopoly ranking). */
export function SortableList<T>({
  items,
  getId,
  getLabel,
  onReorder,
  render,
}: {
  items: T[];
  getId: (t: T) => string;
  getLabel: (t: T) => string;
  onReorder: (items: T[]) => void;
  render: (t: T, index: number) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((x) => getId(x) === e.active.id);
    const to = items.findIndex((x) => getId(x) === e.over!.id);
    onReorder(arrayMove(items, from, to));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((t, i) => (
            <Row key={getId(t)} id={getId(t)} label={getLabel(t)}>
              {render(t, i)}
            </Row>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`flex items-center gap-0.5 ${isDragging ? 'opacity-90' : ''}`}
    >
      <button
        type="button"
        aria-label={`Drag ${label} to reorder`}
        className="-ml-1.5 flex h-11 w-11 shrink-0 touch-none items-center justify-center text-text-2"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
