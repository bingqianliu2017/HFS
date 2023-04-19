// This file is part of HFS - Copyright 2021-2023, Massimo Melina <a@rejetto.com> - License https://www.gnu.org/licenses/gpl-3.0.txt

import { state, useSnapState } from './state'
import { createElement as h, ReactElement, useRef, useState } from 'react'
import { TreeItem, TreeView } from '@mui/lab'
import {
    ChevronRight, ExpandMore, TheaterComedy, Folder, Home,
    InsertDriveFileOutlined, Lock, RemoveRedEye, Web, Upload, Cloud, Delete, HighlightOff
} from '@mui/icons-material'
import { Box } from '@mui/material'
import { reloadVfs, VfsNode, Who } from './VfsPage'
import { iconTooltip, isWindowsDrive, onlyTruthy } from './misc'
import { apiCall } from './api'
import { alertDialog, confirmDialog } from './dialog'

export const FolderIcon = Folder
export const FileIcon = InsertDriveFileOutlined

export default function VfsTree({ id2node }:{ id2node: Map<string, VfsNode> }) {
    const { vfs, selectedFiles } = useSnapState()
    const [selected, setSelected] = useState<string[]>(selectedFiles.map(x => x.id)) // try to restore selection after reload
    const [expanded, setExpanded] = useState(Array.from(id2node.keys()))
    const dragging = useRef<string>()
    const ref = useRef<HTMLElement>()
    if (!vfs)
        return null
    const treeId = 'vfs'
    return h(TreeView, {
        ref,
        expanded,
        selected,
        multiSelect: true,
        id: treeId,
        sx: {
            overflowX: 'auto',
            maxWidth: ref.current && `calc(100vw - ${16 + ref.current.offsetLeft}px)`, // limit possible horizontal scrolling to this element
            '& ul': { borderLeft: '1px dashed #444', marginLeft: '15px' },
        },
        onNodeSelect(ev, ids) {
            setSelected(ids)
            state.selectedFiles = onlyTruthy(ids.map(id => id2node.get(id)))
        }
    }, recur(vfs as Readonly<VfsNode>))

    function isRestricted(who: Who | undefined) {
        return who !== undefined && who !== true
    }

    function recur(node: Readonly<VfsNode>): ReactElement {
        let { id, name, source, isRoot } = node
        if (!id)
            debugger
        const folder = node.type === 'folder'
        if (folder && !isWindowsDrive(source) && source === name) // we need a way to show that the name we are displaying is a source in this ambiguous case, so we add a redundant ./
            source = './' + source
        return h(TreeItem, {
            ref(el: any) { // workaround to permit drag&drop with mui5's tree
                el?.addEventListener('focusin', (e: any) => e.stopImmediatePropagation())
            },
            label: h(Box, {
                draggable: !isRoot,
                onDragStart() {
                    dragging.current = id
                },
                onDragOver(ev) {
                    if (!folder) return
                    const src = dragging.current
                    if (src?.startsWith(id) && !src.slice(id.length + 1).includes('/')) return // src must be not me or my parent
                    ev.preventDefault()
                },
                async onDrop() {
                    const from = dragging.current
                    if (!from) return
                    if (await confirmDialog(`Moving ${from} under ${id}`))
                        apiCall('move_vfs', { from, parent: id }).then(() => {
                            reloadVfs([ id + from.slice(1 + from.lastIndexOf('/', from.length-2)) ])
                        }, alertDialog)
                },
                sx: {
                    display: 'flex',
                    gap: '.5em',
                    lineHeight: '2em',
                    alignItems: 'center',
                }
            },
                h(Box, { display: 'flex', flex: 0, },
                    isRoot ? iconTooltip(Home, "home, or root if you like")
                        : folder ? iconTooltip(FolderIcon, "Folder")
                            : iconTooltip(FileIcon, "File"),
                    // attributes
                    h(Box, { sx: {
                        flex: 0, ml: '2px', my: '2px', '&>*': { fontSize: '87%', opacity: .6, mt: '-2px' },
                        display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'auto auto',
                    } },
                        node.can_delete !== undefined && iconTooltip(Delete, "Delete permission"),
                        node.can_upload !== undefined && iconTooltip(Upload, "Upload permission"),
                        !isRoot && !node.source && iconTooltip(Cloud, "Virtual (no source)"),
                        isRestricted(node.can_see) && iconTooltip(RemoveRedEye, "Restrictions on who can see"),
                        isRestricted(node.can_read) && iconTooltip(Lock, "Restrictions on who can download"),
                        node.default && iconTooltip(Web, "Act as website"),
                        node.masks && iconTooltip(TheaterComedy, "Masks"),
                        node.size === -1 && iconTooltip(HighlightOff, "Source not found")
                    ),
                ),
                isRoot ? "Home"
                    // special rendering if the whole source is not too long, and the name was not customized
                    : source?.length! < 45 && source?.endsWith(name) ? h('span', {},
                        h('span', { style: { opacity: .4 } }, source.slice(0,-name.length)),
                        h('span', {}, source.slice(-name.length)),
                    )
                    : h(Box, { lineHeight: '1.2em' }, name)
            ),
            key: name,
            collapseIcon: h(ExpandMore, {
                onClick(ev) {
                    setExpanded( expanded.filter(x => x !== id) )
                    ev.preventDefault()
                    ev.stopPropagation()
                }
            }),
            expandIcon: h(ChevronRight, {
                onClick(ev) {
                    setExpanded( [...expanded, id] )
                    ev.preventDefault()
                    ev.stopPropagation()
                }
            }),
            nodeId: id
        }, isRoot && !node.children?.length ? h(TreeItem, { nodeId: '?', label: h('i', {}, "nothing here") })
            : node.children?.map(recur))
    }

}