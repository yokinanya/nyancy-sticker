export type SubmitAction = (fd: FormData) => Promise<void>;
export type SubmitHandler = (action: SubmitAction, fd: FormData, done: string) => void;
