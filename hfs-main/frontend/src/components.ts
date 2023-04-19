// This file is part of HFS - Copyright 2021-2023, Massimo Melina <a@rejetto.com> - License https://www.gnu.org/licenses/gpl-3.0.txt

import { hfsEvent, hIcon } from './misc'
import { createElement as h, Fragment, HTMLAttributes, isValidElement, ReactNode, useMemo } from 'react'

export function Spinner(props: any) {
    return hIcon('spinner', { className:'spinner', ...props })
}

export function Flex({ gap='.8em', vert=false, children=null, props={}, ...rest }) {
    return h('div', {
        style: {
            display: 'flex',
            gap,
            flexDirection: vert ? 'column' : undefined,
            ...rest,
        },
        ...props
    }, children)
}

export function FlexV(props:any) {
    return h(Flex, { vert:true, ...props })
}

interface CheckboxProps { children?:ReactNode, value:any, onChange?:(v:boolean)=>void }
export function Checkbox({ onChange, value, children, ...props }:CheckboxProps) {
    const ret = h('input',{
        type: 'checkbox',
        onChange: ev => onChange?.(Boolean(ev.target.checked)),
        checked: Boolean(value),
        value: 1,
        ...props
    })
    return !children ? ret : h('label', {}, ret, children)
}

type Options = { label:string, value:string }[]
interface SelectProps { value:any, onChange?:(v:string)=>void, options:Options }
export function Select({ onChange, value, options, ...props }:SelectProps) {
    return h('select', {
        onChange: ev => // @ts-ignore
            onChange?.(ev.target.value),
        value,
        ...props,
    }, options.map(({ value, label }) => h('option', { key:value, value }, label)))
}

export function Html({ code, ...rest }:{ code:string } & HTMLAttributes<any>) {
    return !code ? null : h('span', { ...rest, ref(x) {
        if (x)
            x.append(document.createRange().createContextualFragment(code))
    } })
}

export function CustomCode({ name, props }: any) {
    return h(Fragment, {}, useMemo(() => {
        const ret = hfsEvent(name, props)
            .filter(x => x === 0 || x)
            .map((x, key) => isValidElement(x) ? h(Fragment, { key }, x)
                : typeof x === 'string' ? h(Html, { key, code: x })
                    : h('span', { key }, x))
        const html = (window as any).HFS.customHtml[name]
        if (html && html.trim())
            ret.push(h(Html, { key: 'x', code: html }))
        return ret
    }, props ? Object.values(props) : []))
}