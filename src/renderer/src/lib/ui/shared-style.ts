import { css } from '../utils'

export const sharedStyle = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    font-weight: normal;
  }

  ul {
    list-style: none;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    background: transparent;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--muted);
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
    transition: background-color 0.15s ease-in-out;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--muted) 70%, transparent);
  }

  ::-webkit-scrollbar-thumb:active {
    background: color-mix(in srgb, var(--muted) 85%, transparent);
  }

  ::-webkit-scrollbar-button {
    display: none;
  }

  ::-webkit-scrollbar-corner {
    background: transparent;
  }
`
