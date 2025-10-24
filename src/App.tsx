import { useEffect, useRef, useState } from 'react'
import './App.css'
import { generatePuzzle } from './utils/create-puzzle'
import type { Fragment, Shape } from './types/img'
import { findClosest } from './utils/check'
import { v7 as uuid } from 'uuid'
import { height, width } from './constants'
import Konva from 'konva'
import type { KonvaEventListener } from 'konva/lib/Node'

const rowCnt = 5;
const colCnt = 5;
function App() {
  const imgs = useRef<Fragment[]>([])
  const onGroupDragEnd: KonvaEventListener<Node, DragEvent> = (e) => {

    const stage = e.target.getStage()!
    const layer = stage.getLayers()[0]
    const group = e.target
    if(group.getClassName()!=='Group')return

    const imgMap = Object.fromEntries<Fragment>(imgs.current.map(img => ([img.src.src, img])))

    const isImage = (n): n is Shape => n.getClassName && n.getClassName() === 'Image'

    const groupImages = (group.getChildren(isImage)) as Shape[]
    if (!groupImages.length) return

    const layerImages = (layer.getChildren(isImage)) as Shape[]
    const otherGroupImages = (layer.getChildren((n) => n.getClassName() === 'Group' && n.id() !== group.id())
      .map((g) => (g).getChildren(isImage)).flat()) as Shape[] || [];

    const candidates: Shape[] = [...layerImages, ...otherGroupImages]

    let movingChild: Shape | null = null
    let closest: Shape | undefined

    for (const child of groupImages) {
      closest = findClosest(child, candidates, imgMap)
      if (closest) {
        movingChild = child
        break
      }
    }

    if (!movingChild || !closest) return

    const a = imgMap[movingChild.attrs.image.src]
    const b = imgMap[closest.attrs.image.src]

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
        const frag = imgMap[s.attrs.image.src]
        if (frag) frag.groupId = thisGroupId
      })

      if ((otherGroup.getChildren(isImage) as Shape[]).length === 0) {
        otherGroup.destroy()
      }
    } else if (!closestInGroup) {
      const savedPos = closest.getAbsolutePosition()
      closest.draggable(false)
      group.add(closest)
      closest.absolutePosition(savedPos)

    }
  }
  const onImageDragEnd: KonvaEventListener<Node, DragEvent> = (e) => {
    const imgMap = Object.fromEntries<Fragment>(imgs.current.map(img => ([img.src.src, img])))
    const a = imgMap[e.target.attrs.image.src]
    const filter = c => c.getClassName() === 'Image' && c.attrs.image.src !== e.target.attrs.image.src
    const allImgs = (e.target.getLayer()?.getChildren(filter)) as Shape[] || [];
    const g = e.target.getLayer()?.getChildren(c => c.getClassName() === 'Group').map(group => (group).getChildren(filter)).flat() as Shape[] || [];
    allImgs.push(...g);
    const closest = findClosest(e.target as Shape, allImgs, imgMap);
    if (!closest) return;
    const b = imgMap[closest.attrs.image.src]
    if (a && b) {
      // 把a合并到b中
      if (b.groupId) {
        a.groupId = b.groupId;
      } else {
        const groupId = uuid();
        a.groupId = groupId;
        b.groupId = groupId;
      }
      const stage = e.target.getStage()!
      const bPos = closest.getAbsolutePosition()
      if (a.row === b.row) {
        const newX = bPos.x + width * (a.col - b.col)
        e.target.absolutePosition({ x: newX, y: bPos.y })
      } else {
        const newY = bPos.y + height * (a.row - b.row)
        e.target.absolutePosition({ x: bPos.x, y: newY })
      }
      const tempAPos = e.target.getAbsolutePosition()
      const tempBPos = closest.getAbsolutePosition()
      const existGroup = stage.getLayers()[0].getChildren(c => c.getClassName() === 'Group' && c.id() === a.groupId)?.[0]
      const group: Group = existGroup || new Konva.Group({
        id: a.groupId,
        draggable: true,
        x: 0,
        y: 0,
      })
      if (!existGroup) {
        group.on('dragend', onGroupDragEnd)
      }
      e.target.draggable(false)
      closest.draggable(false)
      group.add(e.target)
      !existGroup && group.add(closest)
      e.target.absolutePosition(tempAPos)
      closest.absolutePosition(tempBPos)
      !existGroup && stage.getLayers()[0].add(group)
    }
  }
  const generateImgs = () => {
    const stageWidth = 500
    const stageHeight = 500
    const _imgs = generatePuzzle(`https://picsum.photos/${width}/${height}`, rowCnt, colCnt);
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
    imgs.current = (fragments)
    fragments.forEach(img => {
      const image = new Konva.Image({
        image: img.src,
        width,
        height,
        draggable: true,
        x: img.x,
        y: img.y
      })
      image.on('dragend', onImageDragEnd)
      layer.add(image)
    })
    stage.add(layer)

  }
  useEffect(() => {
    generateImgs()
  }, [])


  return (
    <div>
      <button style={{ position: 'fixed', bottom: 20, right: 20 }} onClick={generateImgs}>生成</button>
      <div id='container' />
    </div>
  )
}

export default App
