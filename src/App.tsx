import { useEffect, useRef, useState } from 'react'
import './App.css'
import { generatePuzzle } from './utils/create-puzzle'
import type { Fragment } from './types/img'
import { findClosest } from './utils/check'
import { v7 as uuid } from 'uuid'
import { height, width } from './constants'
import Konva from 'konva'
import type { KonvaEventListener, Node } from 'konva/lib/Node'
import type { Group } from 'konva/lib/Group'
import { clip } from './types/template'
import type { Shape } from 'konva/lib/Shape'

const rowCnt = 5;
const colCnt = 5;
function App() {
  const imgs = useRef<Fragment[]>([])
  const [success, setSuccess] = useState(false)
  const enableShadow = (e: Shape) => {
    e.shadowEnabled(true)
  }
  const disableShadow = (e: Shape) => {
    e.shadowEnabled(false)
  }
  const batchGroupShadow = (group: Group, enabled = true) => {
    if (group.getClassName() !== 'Group') return


    const isImage = (n: Node) => n.getClassName && n.getClassName() === 'Shape'

    const groupImages = (group.getChildren(isImage)) as Shape[]
    if (!groupImages.length) return

    groupImages.forEach(e => e.shadowEnabled(enabled))
  }
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const attachImageBounds = (image: Shape) => {
    image.dragBoundFunc(pos => {
      const stage = image.getStage()
      if (!stage) return pos
      const maxX = stage.width() - image.width()
      const maxY = stage.height() - image.height()
      return {
        x: clamp(pos.x, 0, maxX),
        y: clamp(pos.y, 0, maxY)
      }
    })
  }
  const attachGroupBounds = (group: Group) => {
    group.dragBoundFunc(pos => {
      const stage = group.getStage()
      if (!stage) return pos
      const rect = group.getClientRect({ skipShadow: true })
      const dx = pos.x - group.x()
      const dy = pos.y - group.y()
      const minDx = -rect.x
      const maxDx = stage.width() - (rect.x + rect.width)
      const minDy = -rect.y
      const maxDy = stage.height() - (rect.y + rect.height)
      const ndx = clamp(dx, minDx, maxDx)
      const ndy = clamp(dy, minDy, maxDy)
      return { x: group.x() + ndx, y: group.y() + ndy }
    })
  }
  const waitImage = async (img: HTMLImageElement) => {
    if (img.complete && img.naturalWidth > 0) return
    if ('decode' in img && typeof img.decode === 'function') {
      try { await img.decode() } catch { /* ignore */ }
      return
    }
    await new Promise<void>((resolve) => {
      const onLoad = () => { cleanup(); resolve() }
      const onError = () => { cleanup(); resolve() }
      const cleanup = () => {
        img.removeEventListener('load', onLoad)
        img.removeEventListener('error', onError)
      }
      img.addEventListener('load', onLoad)
      img.addEventListener('error', onError)
    })
  }
  const onGroupDragEnd: KonvaEventListener<Group, DragEvent> = (e) => {

    const stage = e.target.getStage()!
    const layer = stage.getLayers()[0]
    const group = e.target as Group
    if (group.getClassName() !== 'Group') return

    const imgMap = Object.fromEntries<Fragment>(imgs.current.map(img => ([img.src.src, img])))

    const isImage = (n: Node) => n.getClassName && n.getClassName() === 'Shape'

    const groupImages = (group.getChildren(isImage)) as Shape[]
    if (!groupImages.length) return

    groupImages.forEach(disableShadow)
    const layerImages = (layer.getChildren(isImage)) as Shape[]
    const otherGroupImages = ((layer.getChildren((n) => n.getClassName() === 'Group' && n.id() !== group.id()) as Group[])
      .map(g => g.getChildren(isImage)).flat()) as Shape[] || [];

    const candidates = [...layerImages, ...otherGroupImages]

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

    const a = imgMap[movingChild.attrs.fillPatternImage.src]
    const b = imgMap[closest.attrs.fillPatternImage.src]

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
        const frag = imgMap[s.attrs.fillPatternImage.src]
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
    setSuccess(imgs.current.every(img => img.groupId) && new Set(imgs.current.map(img => img.groupId)).size === 1)
  }

  const onImageDragEnd: KonvaEventListener<Shape, DragEvent> = (e) => {
    disableShadow(e.target as Shape)
    if (e.target.getClassName() !== 'Shape') return
    const imgMap = Object.fromEntries<Fragment>(imgs.current.map(img => ([img.src.src, img])))
    const a = imgMap[e.target.attrs.fillPatternImage.src]
    const filter = (c: Node) => c.getClassName() === 'Shape' && c.attrs.fillPatternImage.src !== e.target.attrs.fillPatternImage.src
    const allImgs = (e.target.getLayer()?.getChildren(filter)) as Shape[] || [];
    const g = e.target.getLayer()?.getChildren(c => c.getClassName() === 'Group').map(group => (group as Group).getChildren(filter)).flat() as Shape[] || [];
    allImgs.push(...g);
    const closest = findClosest(e.target as Shape, allImgs, imgMap);
    if (!closest) return;
    const b = imgMap[closest.attrs.fillPatternImage.src]
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
      const existGroup = stage.getLayers()[0].getChildren(c => c.getClassName() === 'Group' && c.id() === a.groupId)?.[0] as Group
      const group = existGroup || new Konva.Group({
        id: a.groupId,
        draggable: true,
        x: 0,
        y: 0,
      })
      if (!existGroup) {
        group.on('dragend', onGroupDragEnd)
        group.on('dragstart', e => batchGroupShadow(e.target as Group))
        group.on('mousedown', e => batchGroupShadow(e.target as Group))
        group.on('mouseup', e => batchGroupShadow(e.target as Group, false))
      }
      e.target.draggable(false)
      closest.draggable(false)
      group.add(e.target)
      if (!existGroup) {
        group.add(closest)
      }
      e.target.absolutePosition(tempAPos)
      closest.absolutePosition(tempBPos)
      attachGroupBounds(group)
      if (!existGroup) {
        stage.getLayers()[0].add(group)
      }
      setSuccess(imgs.current.every(img => img.groupId) && new Set(imgs.current.map(img => img.groupId)).size === 1)
    }
  }
  const generateImgs = async () => {
    setSuccess(false)
    const stageWidth = 500
    const stageHeight = 500
    const _imgs = generatePuzzle(`https://picsum.photos/${width * colCnt}/${height * rowCnt}`, rowCnt, colCnt);
    await Promise.all(_imgs.map(i => waitImage(i.src)))
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
      const image = new Konva.Shape({
        fillPatternImage: img.src,
        width,
        height,
        draggable: true,
        x: img.x,
        y: img.y,
        sceneFunc(ctx, shape) {
          clip(ctx, img.template)
          ctx.fillStrokeShape(shape)
        },
      })
      image.on('dragend', onImageDragEnd)
      image.on('dragstart', e => enableShadow(e.target as Shape))
      image.on('mousedown', e => enableShadow(e.target as Shape))
      image.on('mouseup', e => disableShadow(e.target as Shape))
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
      <button style={{ position: 'fixed', bottom: 20, right: 20 }} onClick={generateImgs}>生成</button>
      <div id='container' style={{ backgroundColor: success ? 'green' : 'unset' }} />
    </div>
  )
}

export default App
