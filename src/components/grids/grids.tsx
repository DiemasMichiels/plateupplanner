import {
  useState,
  useEffect,
  MouseEvent,
  SyntheticEvent,
  DragEvent,
} from 'react';
import { Dropdown, message } from 'antd';
import {
  RotateLeftOutlined,
  RotateRightOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import saveAs from 'file-saver';

import { WallType, SquareType, styledButton } from '../../utils/helpers';
import { Layout } from '../layout/Layout';
import { Serializer } from '../../lib/serializer';

import './grids.css';

interface DrawGridProps {
  height: number;
  width: number;
  layout: Layout;
  setLayoutParent: (layout: Layout) => void;
  handleStartPlan: () => void;
}

export function DrawGrid(props: DrawGridProps) {
  const [dragType, setDragType] = useState<WallType | undefined>(undefined);
  const [lastWall, setLastWall] = useState<[number, number] | undefined>(
    undefined,
  );

  const drawLine = (i: number, j: number, walltype: WallType) => {
    if (i % 2 !== 0 || j % 2 !== 0) {
      setLastWall([i, j]);
      const newLayout = props.layout.clone();
      newLayout.setElement(i, j, walltype);
      if (i % 2 === 0 || j % 2 === 0) {
        // Fix corner walls only if we're drawing a wall, so
        newLayout.fixCornerWalls(); // users can still draw from corners
      }
      props.setLayoutParent(newLayout);
    }
  };

  const handleMouseDown = (i: number, j: number) => {
    const oldWallType = props.layout.layout[i][j] as WallType;
    const newWallType = oldWallType.cycle();

    setDragType(newWallType);
    drawLine(i, j, newWallType);
  };

  const handleMouseUp = () => {
    setDragType(undefined);
  };

  const handleMouseEnter = (i: number, j: number) => {
    if (dragType !== undefined) {
      drawLine(i, j, dragType);
    }
  };

  const handleClosestMouseMove = (i: number, j: number) => {
    if (dragType !== undefined && lastWall !== undefined) {
      if (
        (lastWall[0] === i - 1 || lastWall[0] === i + 1) &&
        (lastWall[1] === j - 2 || lastWall[1] === j + 2)
      ) {
        handleMouseEnter(lastWall[0], j);
      } else if (
        (lastWall[0] === i - 2 || lastWall[0] === i + 2) &&
        (lastWall[1] === j - 1 || lastWall[1] === j + 1)
      ) {
        handleMouseEnter(i, lastWall[1]);
      }
    }
  };

  const handleRemoveWalls = () => {
    const newLayout = props.layout.clone();
    newLayout.removeWalls();
    newLayout.fixCornerWalls();
    props.setLayoutParent(newLayout);
  };

  const getDrawGridElements = () => {
    const gridElements = [];
    for (let i = 0; i < props.height * 2 - 1; i++) {
      for (let j = 0; j < props.width * 2 - 1; j++) {
        const squareType = props.layout.layout[i][j] as SquareType;
        if (i % 2 === 0 && j % 2 === 0) {
          // Cells
          gridElements.push(
            <div
              className='grid-square'
              key={i + '-' + j}
              style={{
                backgroundImage: `url(${SquareType.Empty.getImageDisplayPath()})`,
                filter: 'grayscale(100%) contrast(40%) brightness(130%)',
                backgroundSize: '100% 100%',
              }}
              onMouseMove={() => {
                handleClosestMouseMove(i, j);
              }}
            >
              <img
                className='grid-image'
                draggable={false}
                src={squareType.getImageDisplayPath()}
                alt={squareType.getImageAlt()}
                onError={(event: SyntheticEvent) => {
                  const target = event.currentTarget as HTMLImageElement;
                  target.onerror = null; // prevents looping
                  target.src = '/images/display/404.png';
                }}
                style={{
                  filter: 'grayscale(100%) contrast(40%) brightness(130%)',
                  transform: squareType.getTransform(),
                }}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>,
          );
        } else if (i % 2 === 0 || j % 2 === 0) {
          // Walls
          const wallType = props.layout.layout[i][j] as WallType;
          gridElements.push(
            <div
              className={wallType.getClassName() + '-draw'}
              onMouseEnter={() => {
                handleMouseEnter(i, j);
              }}
              onMouseDown={() => {
                handleMouseDown(i, j);
              }}
              key={i + '-   ' + j}
            />,
          );
        } else {
          const wallType = props.layout.layout[i][j] as WallType; // Wall corners
          gridElements.push(
            <div
              className={wallType.getClassName() + '-draw'}
              onMouseEnter={() => {
                handleMouseEnter(i, j);
              }}
              onMouseDown={() => {
                handleMouseDown(i, j);
              }}
              key={i + '-' + j}
            ></div>,
          );
        }
      }
    }
    return gridElements;
  };

  return (
    <div className='draw-grid-container'>
      <div
        style={{
          textAlign: 'center',
          paddingBottom: '0.5em',
        }}
      >
        <i>
          Click and drag to draw your floorplan; click again to indicate
          counters or delete.
        </i>
      </div>
      <div
        className='draw-grid'
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          userSelect: 'none',
          gridTemplateColumns: `repeat(${props.width - 1}, 2fr 1fr) 2fr`,
          gridTemplateRows: `repeat(${props.height - 1}, 2fr 1fr) 2fr`,
          aspectRatio: `${
            ((props.width - 1) * 3 + 2) / ((props.height - 1) * 3 + 2)
          }`,
        }}
      >
        {getDrawGridElements()}
      </div>
      <div
        className='draw-grid-buttons'
        style={{
          display: 'flex',
          flexFlow: 'row wrap',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <>
          {styledButton(
            'Remove all walls',
            handleRemoveWalls,
            <DeleteOutlined />,
          )}
        </>
      </div>
    </div>
  );
}

interface PlanGridProps {
  height: number;
  width: number;
  layout: Layout;
  setLayoutParent: (layout: Layout) => void;
  draggedMenuItem: SquareType | undefined;
  draggedMenuPosition: [number, number] | undefined;
  handleMenuDrag: (i: number, j: number) => void;
  handleMenuDrop: () => void;
  handleMenuDragAway: () => void;
  textInputInFocus: boolean;
}

export function PlanGrid(props: PlanGridProps) {
  const navigate = useNavigate();
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
    if (
      props.draggedMenuItem !== undefined &&
      props.draggedMenuPosition !== undefined
    ) {
      if (
        props.layout.layout[props.draggedMenuPosition[0]][
          props.draggedMenuPosition[1]
        ] !== SquareType.Empty
      ) {
        const existingItem = props.layout.layout[props.draggedMenuPosition[0]][
          props.draggedMenuPosition[1]
        ] as SquareType;
        return `Replace ${existingItem.getImageAlt()} with ${props.draggedMenuItem.getImageAlt()}`;
      } else {
        return `Add ${props.draggedMenuItem.getImageAlt()}`;
      }
    }

    if (clickedCell !== undefined && draggedOverCell !== undefined) {
      const clickedCellType = props.layout.layout[clickedCell[0]][
        clickedCell[1]
      ] as SquareType;
      const draggedOverCellType = props.layout.layout[draggedOverCell[0]][
        draggedOverCell[1]
      ] as SquareType;
      if (draggedOverCellType === SquareType.Empty) {
        return `Move ${clickedCellType.getImageAlt()}`;
      } else {
        return `Swap ${clickedCellType.getImageAlt()} and ${draggedOverCellType.getImageAlt()}`;
      }
    }

    if (hoveredCell !== undefined) {
      const hoveredCellType = props.layout.layout[hoveredCell[0]][
        hoveredCell[1]
      ] as SquareType;
      if (hoveredCellType !== SquareType.Empty) {
        return `${hoveredCellType.getImageAlt()}`;
      }
    }

    if (selectedCell !== undefined) {
      const selectedCellType = props.layout.layout[selectedCell[0]][
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
      const newLayout = props.layout.clone();
      newLayout.rotateElementRight(i, j);
      props.setLayoutParent(newLayout);
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
      const newLayout = props.layout.clone();
      newLayout.swapElements(
        clickedCell[0],
        clickedCell[1],
        draggedOverCell[0],
        draggedOverCell[1],
      );
      setSelectedCell(undefined);
      props.setLayoutParent(newLayout);
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
      const newLayout = props.layout.clone();
      newLayout.setElement(selectedCell[0], selectedCell[1], SquareType.Empty);
      props.setLayoutParent(newLayout);
      setSelectedCell(undefined);
    }
  };

  const handleRotateLeft = () => {
    if (selectedCell !== undefined) {
      const newLayout = props.layout.clone();
      newLayout.rotateElementLeft(selectedCell[0], selectedCell[1]);
      props.setLayoutParent(newLayout);
    }
  };

  const handleRotateRight = () => {
    if (selectedCell !== undefined) {
      const newLayout = props.layout.clone();
      newLayout.rotateElementRight(selectedCell[0], selectedCell[1]);
      props.setLayoutParent(newLayout);
    }
  };

  const handleRemoveSquares = () => {
    const newLayout = props.layout.clone();
    newLayout.removeSquares();
    props.setLayoutParent(newLayout);
  };

  const handleImageShare = () => {
    html2canvas(document.querySelector('.plan-grid') as HTMLElement).then(
      (canvas) => {
        canvas.toBlob(function (blob) {
          saveAs(blob as Blob, 'kitchen.png');
        });
      },
    );
  };

  const handleLinkShare = () => {
    updateURL();
    navigator.clipboard.writeText(window.location.href);
    message.success('Sharing link copied to clipboard');
  };

  const updateURL = () => {
    const layoutString = Serializer.encodeLayoutString(props.layout);
    if (window.location.hash !== '#' + layoutString) {
      navigate('#' + layoutString, { replace: true });
    }
  };

  useEffect(() => {
    updateURL();
  }, [props.layout]);

  useEffect(() => {
    updateURL();
    window.onkeydown = (event: KeyboardEvent) => {
      if (
        !props.textInputInFocus &&
        (event.key === 'Backspace' || event.key === 'Delete')
      ) {
        handleDelete();
      }
    };
    return function cleanup() {
      window.onkeydown = null;
    };
  }, []);

  const getPlanGridElements = () => {
    const gridElements = [];
    for (let i = 0; i < props.height * 2 - 1; i++) {
      for (let j = 0; j < props.width * 2 - 1; j++) {
        if (i % 2 === 0 && j % 2 === 0) {
          let selected = '';
          if (
            selectedCell !== undefined &&
            selectedCell[0] === i &&
            selectedCell[1] === j
          ) {
            selected = 'grid-selected';
          }

          let squareType = props.layout.layout[i][j] as SquareType;
          let opacity = 1;
          if (draggedOverCell !== undefined) {
            if (draggedOverCell[0] === i && draggedOverCell[1] === j) {
              squareType = props.layout.layout[clickedCell?.[0] ?? 0][
                clickedCell?.[1] ?? 0
              ] as SquareType;
              opacity = 0.7;
            } else if (
              clickedCell !== undefined &&
              clickedCell[0] === i &&
              clickedCell[1] === j
            ) {
              squareType = props.layout.layout[draggedOverCell[0]][
                draggedOverCell[1]
              ] as SquareType;
              opacity = 0.7;
            }
          }

          if (
            props.draggedMenuItem !== undefined &&
            props.draggedMenuPosition !== undefined &&
            props.draggedMenuPosition[0] === i &&
            props.draggedMenuPosition[1] === j
          ) {
            squareType = props.draggedMenuItem;
            opacity = 0.7;
          }

          let image = null;
          if (squareType !== SquareType.Empty) {
            image = (
              <img
                className='grid-image'
                draggable={false}
                src={squareType.getImageDisplayPath()}
                alt={squareType.getImageAlt()}
                onError={(event: SyntheticEvent) => {
                  const target = event.currentTarget as HTMLImageElement;
                  target.onerror = null; // prevents looping
                  target.src = '/images/display/404.png';
                }}
                style={{
                  opacity: opacity,
                  transform: squareType.getTransform(),
                  cursor: 'grab',
                }}
                onMouseDown={(event: MouseEvent) =>
                  handleMouseDown(i, j, event)
                }
                onContextMenu={(e) => e.preventDefault()}
              />
            );
          }
          gridElements.push(
            <div
              className={`grid-square ${selected}`}
              key={i + '-' + j}
              onMouseEnter={() => handleMouseEnter(i, j)}
              onMouseLeave={() => handleMouseLeave()}
              onDragOver={(event: DragEvent) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                props.handleMenuDrag(i, j);
              }}
              onDrop={(event: DragEvent) => {
                event.preventDefault();
                props.handleMenuDrop();
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
          const wallType = props.layout.layout[i][j] as WallType;
          gridElements.push(
            <div
              className={wallType.getClassName() + '-plan'}
              key={i + '-' + j}
            />,
          );
        }
      }
    }
    return gridElements;
  };

  return (
    <div className='plan-grid-container'>
      <div
        style={{
          textAlign: 'center',
          paddingBottom: '0.5em',
        }}
      >
        {getCursorState()}
      </div>
      <div
        className='plan-grid-bounding-box'
        style={{
          aspectRatio: `${
            ((props.width - 1) * 9 + 8) / ((props.height - 1) * 9 + 8)
          }`,
        }}
        onDragOver={(event: DragEvent) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          props.handleMenuDrop();
        }}
        onDragLeave={(event: DragEvent) => {
          event.preventDefault();
          const target = event.target as HTMLDivElement;
          if (target.className === 'plan-grid') {
            props.handleMenuDragAway();
          }
        }}
      >
        <div
          className='plan-grid'
          style={{
            gridTemplateColumns: `repeat(${props.width - 1}, 8fr 1fr) 8fr`,
            gridTemplateRows: `repeat(${props.height - 1}, 8fr 1fr) 8fr`,
            aspectRatio: `${
              ((props.width - 1) * 9 + 8) / ((props.height - 1) * 9 + 8)
            }`,
          }}
          onMouseUp={(event) => handleMouseUp(event)}
        >
          {getPlanGridElements()}
        </div>
      </div>
      <div
        className='plan-grid-buttons'
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <>
          {styledButton(
            '',
            handleRotateLeft,
            <RotateLeftOutlined />,
            false,
            selectedCell === undefined,
          )}
          {styledButton(
            '',
            handleDelete,
            <DeleteOutlined />,
            false,
            selectedCell === undefined,
          )}
          {styledButton(
            '',
            handleRotateRight,
            <RotateRightOutlined />,
            false,
            selectedCell === undefined,
          )}
          {styledButton(
            'Remove all',
            handleRemoveSquares,
            <DeleteOutlined />,
            false,
            props.layout.elements.length <= 0,
          )}
          <Dropdown
            overlay={
              <>
                {styledButton('Copy link', handleLinkShare, <LinkOutlined />)}
                {styledButton(
                  'Save image',
                  handleImageShare,
                  <DownloadOutlined />,
                )}
              </>
            }
            placement='bottom'
          >
            {styledButton('Share', handleImageShare, <ShareAltOutlined />)}
          </Dropdown>
        </>
      </div>
    </div>
  );
}
