import { LaniaConfig, ConfigurationGetType, CliConfigModule } from '@lania-cli/types';
import { ConfigurationLoader } from '../lib/configuration-loader';
import path from 'path';

export const getCliConfig = async (
    module: CliConfigModule | ConfigurationGetType,
    lanConfigPath?: string,
) => {
    if (typeof module === 'object' && !module.module) {
        return module as Record<string, any>;
    }
    if (!lanConfigPath) {
        return await ConfigurationLoader.load(module as CliConfigModule);
    }
    const lanDirname = path.dirname(lanConfigPath);
    return await ConfigurationLoader.load(module as CliConfigModule, lanDirname);
};

export const getLanConfig = async (config?: ConfigurationGetType, lanConfigPath?: string) => {
    return (await getCliConfig(config ?? 'lan', lanConfigPath)) as LaniaConfig;
};

export const getStylelintConfig = async (config?: ConfigurationGetType, lanConfigPath?: string) => {
    return (await getCliConfig(config ?? 'stylelint', lanConfigPath));
};

export const getPrettierConfig = async (config?: ConfigurationGetType, lanConfigPath?: string) => {
    return (await getCliConfig(config ?? 'prettier', lanConfigPath));
};

export const getTextlintConfig = async (config?: ConfigurationGetType, lanConfigPath?: string) => {
    return (await getCliConfig(config ?? 'textlint', lanConfigPath));
};

export const getEslintConfig = async (config?: ConfigurationGetType, lanConfigPath?: string) => {
    return (await getCliConfig(config ?? 'eslint', lanConfigPath));
};
