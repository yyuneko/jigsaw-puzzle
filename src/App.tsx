import { useEffect, useRef, useState } from 'react'
import './App.css'
import { generatePuzzle, waitImage } from './utils/create-puzzle'
import type { Fragment } from './types/img'
import { findClosest } from './utils/check'
import { v7 as uuid } from 'uuid'
import { height, width } from './constants'
import Konva from 'konva'
import type { Node } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import { clip } from './types/template'
import type { Shape } from 'konva/lib/Shape'
import { attachGroupBounds, attachImageBounds } from './utils/play'

const rowCnt = 5;
const colCnt = 5;

function App() {
  const imgMap = useRef<Record<string, Fragment>>({})
  const [success, setSuccess] = useState(false)
  const currentMove = useRef<{ type: 'Shape' | 'Group', ele: Shape | Group }>(undefined)
  const onGroupDragEnd = (group: Group) => {
    const stage = group.getStage()!
    const layer = stage.getLayers()[0]
    if (group.getClassName() !== 'Group') return
    const isImage = (n: Node) => n.getClassName && n.getClassName() === 'Shape'
    const groupImages = (group.getChildren(isImage)) as Shape[]
    if (!groupImages.length) return

    const layerImages = (layer.getChildren(isImage)) as Shape[]
    const otherGroupImages = ((layer.getChildren((n) => n.getClassName() === 'Group' && n.id() !== group.id()) as Group[])
      .map(g => g.getChildren(isImage)).flat()) as Shape[] || [];

    const candidates = [...layerImages, ...otherGroupImages]

    let movingChild: Shape | null = null
    let closest: Shape | undefined

    for (const child of groupImages) {
      closest = findClosest(child, candidates, imgMap.current)
      if (closest) {
        movingChild = child
        break
      }
    }

    if (!movingChild || !closest) return

    const a = imgMap.current[movingChild.id()]
    const b = imgMap.current[closest.id()]

    const aPos = movingChild.getAbsolutePosition()
    const bPos = closest.getAbsolutePosition()

    let desiredX = aPos.x
    let desiredY = aPos.y

    if (a.row === b.row) {
      desiredX = bPos.x + width * (a.col - b.col)
      desiredY = bPos.y
    } else {
      desiredX = bPos.x
      desiredY = bPos.y + height * (a.row - b.row)
    }

    const gPos = group.getAbsolutePosition()
    const dx = desiredX - aPos.x
    const dy = desiredY - aPos.y
    group.absolutePosition({ x: gPos.x + dx, y: gPos.y + dy })

    const closestParent = closest.getParent()
    const closestInGroup = closestParent && (closestParent).getClassName && (closestParent).getClassName() === 'Group'

    const thisGroupId = group.id()

    if (closestInGroup && (closestParent).id() !== group.id()) {
      const otherGroup = closestParent
      const otherImages = (otherGroup.getChildren(isImage)) as Shape[]
      const saved = otherImages.map(s => ({ s, pos: s.getAbsolutePosition() }))

      otherImages.forEach((s) => {
        group.add(s)
      })

      saved.forEach(({ s, pos }) => s.absolutePosition(pos))

      otherImages.forEach((s) => {
        const frag = imgMap.current[s.id()]
        if (frag) frag.groupId = thisGroupId
      })

      if ((otherGroup.getChildren(isImage) as Shape[]).length === 0) {
        otherGroup.destroy()
      }
      attachGroupBounds(group)
    } else if (!closestInGroup) {
      const savedPos = closest.getAbsolutePosition()
      closest.draggable(false)
      group.add(closest)
      closest.absolutePosition(savedPos)
      attachGroupBounds(group)
    }
    const imgs = Object.values(imgMap.current)
    setSuccess(imgs.every(img => img.groupId) && new Set(imgs.map(img => img.groupId)).size === 1)
  }

  const onImageDragEnd = (e: Shape) => {
    if (e.getClassName() !== 'Shape') return
    const a = imgMap.current[e.id()]
    const filter = (c: Node) => c.getClassName() === 'Shape' && c.id() !== e.id()
    const allImgs = (e.getLayer()?.getChildren(filter)) as Shape[] || [];
    const g = e.getLayer()?.getChildren(c => c.getClassName() === 'Group').map(group => (group as Group).getChildren(filter)).flat() as Shape[] || [];
    allImgs.push(...g);
    const closest = findClosest(e, allImgs, imgMap.current);
    if (!closest) return;
    const b = imgMap.current[closest.id()]
    if (a && b) {
      // 把a合并到b中
      if (b.groupId) {
        a.groupId = b.groupId;
      } else {
        const groupId = uuid();
        a.groupId = groupId;
        b.groupId = groupId;
      }
      const stage = e.getStage()!
      const bPos = closest.getAbsolutePosition()
      if (a.row === b.row) {
        const newX = bPos.x + width * (a.col - b.col)
        e.absolutePosition({ x: newX, y: bPos.y })
      } else {
        const newY = bPos.y + height * (a.row - b.row)
        e.absolutePosition({ x: bPos.x, y: newY })
      }
      const tempAPos = e.getAbsolutePosition()
      const tempBPos = closest.getAbsolutePosition()
      const existGroup = stage.getLayers()[0].getChildren(c => c.getClassName() === 'Group' && c.id() === a.groupId)?.[0] as Group
      const group = existGroup || new Konva.Group({
        id: a.groupId,
        draggable: true,
        x: 0,
        y: 0,
      })
      e.draggable(false)
      closest.draggable(false)
      group.add(e)
      if (!existGroup) {
        group.add(closest)
      }
      e.absolutePosition(tempAPos)
      closest.absolutePosition(tempBPos)
      attachGroupBounds(group)
      if (!existGroup) {
        stage.getLayers()[0].add(group)
      }
      const imgs = Object.values(imgMap.current)
      setSuccess(imgs.every(img => img.groupId) && new Set(imgs.map(img => img.groupId)).size === 1)
    }
  }
  const generateImgs = async () => {
    setSuccess(false)
    const stageWidth = window.innerWidth
    const stageHeight = window.innerHeight
    const originImage = `https://picsum.photos/${width * colCnt}/${height * rowCnt}`
    const _imgs = generatePuzzle(rowCnt, colCnt);
    const centerX = stageWidth * 0.2
    const centerY = stageHeight * 0.2
    const centerW = stageWidth * 0.6
    const centerH = stageHeight * 0.6

    const pickPos = () => {
      for (let i = 0; i < 1000; i++) {
        const x = Math.floor(Math.random() * (stageWidth - width))
        const y = Math.floor(Math.random() * (stageHeight - height))
        const inCenter = x >= centerX && x <= centerX + centerW - width && y >= centerY && y <= centerY + centerH - height
        if (!inCenter) return { x, y }
      }
      return { x: 0, y: 0 }
    }

    const fragments = _imgs.map(img => ({
      ...img,
      ...pickPos()
    }))

    const layer = new Konva.Layer();


    const stage = new Konva.Stage({
      container: 'container',
      width: stageWidth,
      height: stageHeight
    })

    stage.on('mousemove', e => {
      if (!currentMove.current?.ele) return;
      currentMove.current.ele.move({ x: e.evt.movementX, y: e.evt.movementY })
    })
    stage.on('mouseup', e => {
      const type = e.target.getClassName()
      if (!['Group', 'Shape'].includes(type) || !currentMove.current) return;
      if (type === 'Shape') {
        const originGroupId = imgMap.current[e.target.id()].groupId
        onImageDragEnd(e.target as Shape)
        if (originGroupId !== imgMap.current[e.target.id()].groupId) {
          e.evt.preventDefault()
        }
      } else {
        onGroupDragEnd(e.target as Group)
      }
    })
    stage.on('click', e => {
      let type = e.target.getClassName()
      if (!['Group', 'Shape'].includes(type)) return;
      let ele = e.target as Shape | Group
      if (!e.evt.defaultPrevented && type === 'Shape' && imgMap.current[e.target.id()].groupId) {
        type = 'Group'
        ele = e.target.parent as Group
      }
      if (['Group', 'Shape'].includes(type) && currentMove.current?.ele !== ele) {
        ele.zIndex(rowCnt * colCnt)
        currentMove.current = { type: type as 'Group' | 'Shape', ele }
      } else {
        currentMove.current = undefined
      }
    })
    imgMap.current = Object.fromEntries<Fragment>(fragments.map(img => ([img.id, img])))
    const fillPatternImage = new Image()
    fillPatternImage.src = originImage
    await waitImage(fillPatternImage)
    fragments.forEach(img => {
      const image = new Konva.Shape({
        fillPatternImage,
        width,
        height,
        draggable: true,
        id: img.id,
        x: img.x,
        y: img.y,
        fillPatternOffset: { x: img.col * width, y: img.row * height },
        sceneFunc(ctx, shape) {
          clip(ctx, img.template)
          ctx.fillStrokeShape(shape)
        },
      })
      attachImageBounds(image)
      layer.add(image)
    })
    stage.add(layer)

  }

  useEffect(() => {
    generateImgs()
  }, [])


  return (
    <div>
      <button style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }} onClick={generateImgs}>生成</button>
      <div id='container' style={{ backgroundColor: success ? 'green' : 'pink' }} />
    </div>
  )
}

export default App
