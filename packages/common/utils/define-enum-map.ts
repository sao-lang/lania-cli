type EnumItem = {
    label: string;
    value: string | number;
    children?: EnumItem[];
    [key: string]: any;
};

type EnumMap = Record<string, EnumItem>;

type BuildOption<LK extends string, VK extends string> = {
    [K in LK | VK]: string | number;
} & {
    children?: BuildOption<LK, VK>[];
};

type EnumHelper<T extends EnumMap> = {
    getOptionList: <LK extends string = 'label', VK extends string = 'value'>(config?: {
        labelKey?: LK;
        valueKey?: VK;
        prepend?: BuildOption<LK, VK>[];
        append?: BuildOption<LK, VK>[];
    }) => BuildOption<LK, VK>[];

    findLabelByValue: (value: string | number) => string | undefined;
    findValueByLabel: (label: string) => string | number | undefined;
    findItemByValue: (value: string | number) => EnumItem | undefined;
    getRawMap: () => T;
    hasValueKey: (value: string | number) => boolean;
    hasLabelText: (label: string) => boolean;
    entries: () => [string, EnumItem][];
    keys: () => (keyof T)[];
    values: () => EnumItem[];
} & {
    [K in keyof T]: T[K];
};

export function defineEnumMap<T extends EnumMap>(enumMap: T): EnumHelper<T> {
    const labelMap = new Map<string | number, string>();
    const valueMap = new Map<string, string | number>();
    const valueItemMap = new Map<string | number, EnumItem>();
    const optionsCache = new Map<string, BuildOption<string, string>[]>();

    function collect(item: EnumItem) {
        labelMap.set(item.value, item.label);
        valueMap.set(item.label, item.value);
        valueItemMap.set(item.value, item);
        if (item.children) item.children.forEach(collect);
    }

    Object.values(enumMap).forEach(collect);

    const baseHelper = {
        getOptionList<LK extends string = 'label', VK extends string = 'value'>(config?: {
            labelKey?: LK;
            valueKey?: VK;
            prepend?: BuildOption<LK, VK>[];
            append?: BuildOption<LK, VK>[];
        }): BuildOption<LK, VK>[] {
            const {
                labelKey = 'label' as LK,
                valueKey = 'value' as VK,
                prepend = [],
                append = [],
            } = config || {};

            const cacheKey = JSON.stringify({ labelKey, valueKey });

            if (optionsCache.has(cacheKey)) {
                return [...prepend, ...optionsCache.get(cacheKey)!, ...append] as BuildOption<
                    LK,
                    VK
                >[];
            }

            function build(items: EnumItem[]): BuildOption<LK, VK>[] {
                return items.map((item) => {
                    const option = {
                        [labelKey]: item?.label,
                        [valueKey]: item?.value,
                    } as BuildOption<LK, VK>;

                    if (item.children?.length) {
                        option.children = build(item.children);
                    }

                    return option;
                });
            }

            const core = build(Object.values(enumMap));
            optionsCache.set(cacheKey, core);
            return [...prepend, ...core, ...append];
        },

        findLabelByValue(value: string | number) {
            return labelMap.get(value);
        },

        findValueByLabel(label: string) {
            return valueMap.get(label);
        },

        findItemByValue(value: string | number) {
            return valueItemMap.get(value);
        },

        getRawMap() {
            return enumMap;
        },

        hasValueKey(value: string | number) {
            return labelMap.has(value);
        },

        hasLabelText(label: string) {
            return valueMap.has(label);
        },

        entries() {
            return Object.entries(enumMap);
        },

        keys() {
            return Object.keys(enumMap) as (keyof T)[];
        },

        values() {
            return Object.values(enumMap);
        },
    };

    // 加 Proxy，支持 enumHelper.xxx 访问对应项
    const proxy = new Proxy(baseHelper as EnumHelper<T>, {
        get(target, prop: string) {
            if (prop in target) return (target as any)[prop];
            if (prop in enumMap) return enumMap[prop as keyof T];
            return undefined;
        },
    });

    return proxy;
}
