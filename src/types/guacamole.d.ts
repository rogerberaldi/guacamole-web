declare namespace Guacamole {
  export class Client {
    constructor(tunnel: Tunnel);

    connect(data?: string): void;
    disconnect(): void;
    sendKeyEvent(pressed: boolean, keysym: number): void;
    sendMouseState(mouseState: Mouse.State): void;
    sendSize(width: number, height: number): void;
    setClipboard(data: string, type?: string): void;
    createArgumentValueStream(mimetype: string, name: string): OutputStream;
    createFileStream(mimetype: string, filename: string): OutputStream;

    getDisplay(): Display;

    onmouseenter: ((this: Client, ev: any) => any) | null;
    onmouseleave: ((this: Client, ev: any) => any) | null;
    onmousedown: ((this: Client, ev: any) => any) | null;
    onmouseup: ((this: Client, ev: any) => any) | null;
    onmousemove: ((this: Client, ev: any) => any) | null;
    onkeydown: ((this: Client, ev: any) => any) | null;
    onkeyup: ((this: Client, ev: any) => any) | null;

    onstatechange: ((this: Client, state: number) => any) | null;
    onerror: ((this: Client, status: Status) => any) | null;
    onclipboard: ((this: Client, stream: InputStream, mimetype: string) => any) | null;
    onfile: ((this: Client, stream: InputStream, mimetype: string, filename: string) => any) | null;
    onfilesystem: ((this: Client, object: object, name: string) => any) | null;
    onname: ((this: Client, name: string) => any) | null;
    onsync: ((this: Client, timestamp: number) => any) | null;
    onaudio: ((this: Client, stream: InputStream, mimetype: string) => any) | null;
    onvideo: ((this: Client, stream: InputStream, mimetype: string) => any) | null;
    onpipe: ((this: Client, stream: InputStream, mimetype: string, name: string) => any) | null;
    onargv: ((this: Client, stream: InputStream, mimetype: string, name: string) => any) | null;
  }

  export namespace Client {
    const IDLE: number;
    const CONNECTING: number;
    const WAITING: number;
    const CONNECTED: number;
    const DISCONNECTING: number;
    const DISCONNECTED: number;
  }

  export class WebSocketTunnel extends Tunnel {
    constructor(url: string);
  }

  export class Tunnel {
    connect(data?: string): void;
    disconnect(): void;
    sendMessage(...elements: any[]): void;

    onerror: ((this: Tunnel, status: Status) => any) | null;
    onstatechange: ((this: Tunnel, state: number) => any) | null;
    oninstruction: ((this: Tunnel, opcode: string, parameters: string[]) => any) | null;
    onuuid: ((this: Tunnel, uuid: string) => any) | null;
    uuid: string;
  }

  export namespace Tunnel {
    const CONNECTING: number;
    const OPEN: number;
    const CLOSED: number;
  }

  export class Display {
    getElement(): HTMLElement;
    getWidth(): number;
    getHeight(): number;
    getDefaultLayer(): Display.VisibleLayer;
    scale(scale: number): void;
    showCursor(show: boolean): void;

    oncursor: ((this: Display, canvas: HTMLCanvasElement, x: number, y: number) => any) | null;
    onresize: ((this: Display, width: number, height: number) => any) | null;
  }

  export namespace Display {
    export class VisibleLayer {
      getCanvas(): HTMLCanvasElement;
      resize(width: number, height: number): void;
    }
  }

  export class Mouse {
    constructor(element: HTMLElement);

    onmousedown: ((this: Mouse, state: Mouse.State) => any) | null;
    onmouseup: ((this: Mouse, state: Mouse.State) => any) | null;
    onmousemove: ((this: Mouse, state: Mouse.State) => any) | null;
    onmouseout: ((this: Mouse, state: Mouse.State) => any) | null;
  }

  export namespace Mouse {
    export class State {
      x: number;
      y: number;
      left: boolean;
      middle: boolean;
      right: boolean;
      up: boolean;
      down: boolean;

      constructor(x: number, y: number, left: boolean, middle: boolean, right: boolean, up: boolean, down: boolean);
    }

    export namespace State {
      export class Touchpad {
        constructor();

        onmousedown: ((state: Mouse.State) => any) | null;
        onmouseup: ((state: Mouse.State) => any) | null;
        onmousemove: ((state: Mouse.State) => any) | null;
      }
    }
  }

  export class Keyboard {
    constructor(element: HTMLElement);

    onkeydown: ((this: Keyboard, keysym: number) => boolean) | null;
    onkeyup: ((this: Keyboard, keysym: number) => any) | null;

    press(keysym: number): void;
    release(keysym: number): void;
    reset(): void;
  }

  export namespace Keyboard {
    function getModifierMask(): number;
  }

  export class InputStream {
    sendBlob(data: Blob): void;
    sendText(text: string): void;
    sendEnd(): void;

    onblob: ((this: InputStream, blob: Blob) => any) | null;
    onend: ((this: InputStream) => any) | null;
  }

  export class OutputStream {
    sendBlob(data: Blob): void;
    sendText(text: string): void;
    sendEnd(): void;

    onack: ((this: OutputStream, status: Status) => any) | null;
  }

  export class Status {
    code: number;
    message: string;

    constructor(code: number, message?: string);

    isError(): boolean;
  }

  export namespace Status {
    export class Code {
      static SUCCESS: number;
      static UNSUPPORTED: number;
      static SERVER_ERROR: number;
      static SERVER_BUSY: number;
      static UPSTREAM_TIMEOUT: number;
      static UPSTREAM_ERROR: number;
      static RESOURCE_NOT_FOUND: number;
      static RESOURCE_CONFLICT: number;
      static RESOURCE_CLOSED: number;
      static UPSTREAM_NOT_FOUND: number;
      static UPSTREAM_UNAVAILABLE: number;
      static SESSION_CONFLICT: number;
      static SESSION_TIMEOUT: number;
      static SESSION_CLOSED: number;
      static CLIENT_BAD_REQUEST: number;
      static CLIENT_UNAUTHORIZED: number;
      static CLIENT_FORBIDDEN: number;
      static CLIENT_TIMEOUT: number;
      static CLIENT_OVERRUN: number;
      static CLIENT_BAD_TYPE: number;
      static CLIENT_TOO_MANY: number;
    }
  }

  export class AudioPlayer {
    constructor();

    sync(timestamp: number): void;
  }

  export class VideoPlayer {
    constructor();

    sync(timestamp: number): void;
  }

  export namespace RawAudioFormat {
    function parse(mimetype: string): RawAudioFormat;
  }

  export class RawAudioFormat {
    rate: number;
    channels: number;
    bps: number;
  }

  export interface Layer {
    width: number;
    height: number;
    getCanvas(): HTMLCanvasElement;
    resize(width: number, height: number): void;
  }

  export class ArrayBufferReader {
    constructor(buffer: ArrayBuffer);

    readBlob(length: number): Blob;
    readString(length: number): string;
    readInt(): number;
  }

  export class ArrayBufferWriter {
    constructor();

    writeBlob(blob: Blob): void;
    writeString(text: string): void;
    writeInt(value: number): void;
    toArrayBuffer(): ArrayBuffer;
  }

  export class StringReader {
    constructor(str: string);

    read(length: number): string;
  }

  export class StringWriter {
    constructor();

    write(str: string): void;
    toString(): string;
  }

  export class Parser {
    oninstruction: ((this: Parser, opcode: string, parameters: string[]) => any) | null;

    receive(data: string): void;
  }

  export namespace Parser {
    function parseInstruction(str: string): [string, string[]];
  }
}

export default Guacamole;
