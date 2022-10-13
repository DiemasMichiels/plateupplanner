import { ActionIcon, Button } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import {
  IconRotate2,
  IconRotateClockwise2,
  IconTrash,
  IconTrashX,
} from '@tabler/icons';
import {
  useState,
  useEffect,
  SyntheticEvent,
  MouseEvent,
  DragEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import shallow from 'zustand/shallow';
import { Serializer } from '../../lib/serializer';
import { useLayoutStore } from '../../store/layoutStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { SquareType, WallType } from '../../utils/helpers';
import * as styled from './styled';

const PlanGrid = () => {
  const navigate = useNavigate();
  const [width, height] = useWorkspaceStore(
    (state) => [state.width, state.height],
    shallow,
  );
  const [
    layout,
    setLayout,
    draggedItem,
    draggedPosition,
    setDraggedPosition,
    handleDropInGrid,
  ] = useLayoutStore(
    (state) => [
      state.layout,
      state.setLayout,
      state.draggedItem,
      state.draggedPosition,
      state.setDraggedPosition,
      state.handleDropInGrid,
    ],
    shallow,
  );

  const [hoveredCell, setHoveredCell] = useState<[number, number] | undefined>(
    undefined,
  );
  const [selectedCell, setSelectedCell] = useState<
    [number, number] | undefined
  >(undefined);
  const [clickedCell, setClickedCell] = useState<[number, number] | undefined>(
    undefined,
  );
  const [draggedOverCell, setDraggedOverCell] = useState<
    [number, number] | undefined
  >(undefined);

  const getCursorState = () => {
    if (draggedItem !== undefined && draggedPosition !== undefined) {
      if (
        layout?.layout[draggedPosition[0]][draggedPosition[1]] !==
        SquareType.Empty
      ) {
        const existingItem = layout?.layout[draggedPosition[0]][
          draggedPosition[1]
        ] as SquareType;
        return `Replace ${existingItem.getImageAlt()} with ${draggedItem.getImageAlt()}`;
      } else {
        return `Add ${draggedItem.getImageAlt()}`;
      }
    }

    if (clickedCell !== undefined && draggedOverCell !== undefined) {
      const clickedCellType = layout?.layout[clickedCell[0]][
        clickedCell[1]
      ] as SquareType;
      const draggedOverCellType = layout?.layout[draggedOverCell[0]][
        draggedOverCell[1]
      ] as SquareType;
      if (draggedOverCellType === SquareType.Empty) {
        return `Move ${clickedCellType.getImageAlt()}`;
      } else {
        return `Swap ${clickedCellType.getImageAlt()} and ${draggedOverCellType.getImageAlt()}`;
      }
    }

    if (hoveredCell !== undefined) {
      const hoveredCellType = layout?.layout[hoveredCell[0]][
        hoveredCell[1]
      ] as SquareType;
      if (hoveredCellType !== SquareType.Empty) {
        return `${hoveredCellType.getImageAlt()}`;
      }
    }

    if (selectedCell !== undefined) {
      const selectedCellType = layout?.layout[selectedCell[0]][
        selectedCell[1]
      ] as SquareType;
      return `Selected ${selectedCellType.getImageAlt()}`;
    }

    return <i>Left click to select or drag; right click to rotate.</i>;
  };

  const handleMouseDown = (i: number, j: number, event: MouseEvent) => {
    if (event.button === 0 && clickedCell === undefined) {
      setClickedCell([i, j]);
    } else if (event.button === 2) {
      const newLayout = layout?.clone();
      newLayout?.rotateElementRight(i, j);
      setLayout(newLayout);
    }
  };

  const handleMouseEnter = (i: number, j: number) => {
    if (clickedCell !== undefined) {
      setDraggedOverCell([i, j]);
    }
    setHoveredCell([i, j]);
  };

  const handleMouseLeave = () => {
    setHoveredCell(undefined);
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (event.button === 2) {
      return;
    }
    if (clickedCell !== undefined && draggedOverCell !== undefined) {
      const newLayout = layout?.clone();
      newLayout?.swapElements(
        clickedCell[0],
        clickedCell[1],
        draggedOverCell[0],
        draggedOverCell[1],
      );
      setSelectedCell(undefined);
      setLayout(newLayout);
    } else if (
      clickedCell !== undefined &&
      (selectedCell === undefined ||
        clickedCell[0] !== selectedCell[0] ||
        clickedCell[1] !== selectedCell[1])
    ) {
      setSelectedCell(clickedCell);
    } else {
      setSelectedCell(undefined);
    }
    setClickedCell(undefined);
    setDraggedOverCell(undefined);
  };

  const handleDelete = () => {
    if (selectedCell !== undefined) {
      const newLayout = layout?.clone();
      newLayout?.setElement(selectedCell[0], selectedCell[1], SquareType.Empty);
      setLayout(newLayout);
      setSelectedCell(undefined);
    }
  };

  const handleRotateLeft = () => {
    if (selectedCell !== undefined) {
      const newLayout = layout?.clone();
      newLayout?.rotateElementLeft(selectedCell[0], selectedCell[1]);
      setLayout(newLayout);
    }
  };

  const handleRotateRight = () => {
    if (selectedCell !== undefined) {
      const newLayout = layout?.clone();
      newLayout?.rotateElementRight(selectedCell[0], selectedCell[1]);
      setLayout(newLayout);
    }
  };

  const handleRemoveSquares = () => {
    const newLayout = layout?.clone();
    newLayout?.removeSquares();
    setLayout(newLayout);
  };

  const updateURL = () => {
    if (layout) {
      const layoutString = Serializer.encodeLayoutString(layout);
      if (window.location.hash !== '#' + layoutString) {
        navigate('#' + layoutString, { replace: true });
      }
    }
  };

  useEffect(() => {
    updateURL();
  }, [layout]);

  useHotkeys([
    ['Backspace', () => handleDelete()],
    ['Delete', () => handleDelete()],
  ]);

  const getPlanGridElements = () => {
    const gridElements = [];
    for (let i = 0; i < height * 2 - 1; i++) {
      for (let j = 0; j < width * 2 - 1; j++) {
        if (i % 2 === 0 && j % 2 === 0) {
          let selected = '';
          if (
            selectedCell !== undefined &&
            selectedCell[0] === i &&
            selectedCell[1] === j
          ) {
            selected = 'grid-selected';
          }

          let squareType = layout?.layout?.[i]?.[j] as SquareType;
          let opacity = 1;
          if (draggedOverCell !== undefined) {
            if (draggedOverCell[0] === i && draggedOverCell[1] === j) {
              squareType = layout?.layout[clickedCell?.[0] ?? 0][
                clickedCell?.[1] ?? 0
              ] as SquareType;
              opacity = 0.7;
            } else if (
              clickedCell !== undefined &&
              clickedCell[0] === i &&
              clickedCell[1] === j
            ) {
              squareType = layout?.layout[draggedOverCell[0]][
                draggedOverCell[1]
              ] as SquareType;
              opacity = 0.7;
            }
          }

          if (
            draggedItem !== undefined &&
            draggedPosition !== undefined &&
            draggedPosition[0] === i &&
            draggedPosition[1] === j
          ) {
            squareType = draggedItem;
            opacity = 0.7;
          }

          let image = null;
          if (squareType !== SquareType.Empty) {
            image = (
              <img
                className='grid-image'
                draggable={false}
                src={squareType?.getImageDisplayPath()}
                alt={squareType?.getImageAlt()}
                onError={(event: SyntheticEvent) => {
                  const target = event.currentTarget as HTMLImageElement;
                  target.onerror = null; // prevents looping
                  target.src = '/images/display/404.png';
                }}
                style={{
                  opacity: opacity,
                  transform: 'scale(1.1)' + squareType?.getTransform(),
                  cursor: 'grab',
                }}
                onMouseDown={(event: MouseEvent) =>
                  handleMouseDown(i, j, event)
                }
                onContextMenu={(e) => e.preventDefault()}
              />
            );
          } else {
            image = <div className='grid-image' />;
          }

          gridElements.push(
            <div
              className={`grid-square ${selected}`}
              key={i + '-' + j}
              onMouseEnter={() => handleMouseEnter(i, j)}
              onMouseLeave={() => handleMouseLeave()}
              onDragOver={(event: DragEvent) => {
                event.preventDefault();
                if (event.dataTransfer) {
                  event.dataTransfer.dropEffect = 'move';
                }
                setDraggedPosition(i, j);
              }}
              onDrop={(event: DragEvent) => {
                event.preventDefault();
                handleDropInGrid();
              }}
              style={{
                backgroundImage: `url(${SquareType.Empty.getImageDisplayPath()})`,
                backgroundSize: '100% 100%',
                userSelect: 'none',
              }}
            >
              {image}
            </div>,
          );
        } else {
          const wallType = layout?.layout?.[i]?.[j] as WallType;
          gridElements.push(
            <div
              className={wallType?.getClassName() + '-plan'}
              key={i + '-' + j}
            />,
          );
        }
      }
    }
    return gridElements;
  };

  return (
    <styled.GridContainer>
      <i>{getCursorState()}</i>

      <styled.PlanGrid
        id='plan-grid'
        width={width - 1}
        height={height - 1}
        onDragOver={(event: DragEvent) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          handleDropInGrid();
        }}
        onMouseUp={(event) => handleMouseUp(event)}
      >
        {getPlanGridElements()}
      </styled.PlanGrid>
      <styled.Buttons>
        <ActionIcon
          onClick={() => handleRotateLeft()}
          size='xl'
          radius='xl'
          disabled={selectedCell === undefined}
        >
          <IconRotate2 stroke='2.5' size={20} />
        </ActionIcon>
        <ActionIcon
          onClick={() => handleDelete()}
          size='xl'
          radius='xl'
          disabled={selectedCell === undefined}
        >
          <IconTrashX stroke='2.5' size={20} />
        </ActionIcon>
        <ActionIcon
          onClick={() => handleRotateRight()}
          size='xl'
          radius='xl'
          disabled={selectedCell === undefined}
        >
          <IconRotateClockwise2 stroke='2.5' size={20} />
        </ActionIcon>
        <Button
          onClick={() => handleRemoveSquares()}
          leftIcon={<IconTrash />}
          size='md'
          radius='xl'
          disabled={(layout?.elements.length ?? -1) <= 0}
        >
          Remove all items
        </Button>
      </styled.Buttons>
    </styled.GridContainer>
  );
};

export default PlanGrid;