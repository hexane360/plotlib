import React from 'react';
import { StylesProps, useProps, useStyles } from './theme';
import classes from './Spinner.module.css';

export interface SpinnerProps extends StylesProps {
    /** Pixel width of the area the spinner is centered within. */
    width: number;
    /** Pixel height of the area the spinner is centered within. */
    height: number;
}

export default function Spinner(props_: SpinnerProps) {
    const props = useProps('Spinner', props_, {});
    const styles = useStyles('Spinner', props, classes);
    const r = Math.max(8, Math.min(16, props.width, props.height));
    const circumference = 2 * Math.PI * r;

    const cx = props.width / 2;
    const cy = props.height / 2;

    return <circle {...styles}
            r={r} cx={cx} cy={cy} strokeWidth={r / 4}
            strokeDasharray={`${circumference * 0.25} ${circumference}`}
        >
        <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
            dur="0.8s" repeatCount="indefinite"/>
    </circle>;
}
