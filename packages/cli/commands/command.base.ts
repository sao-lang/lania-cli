import { Command } from 'commander';
export abstract class LaniaCommand {
    public abstract load(program: Command): void;
}
