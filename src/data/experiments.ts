export interface Experiment {
    id: string;
    order: number;
    title: string;
    description: string;
    thumbnail: string;
    tags: string[];
    href: string;
}

const entries = import.meta.glob<Omit<Experiment, 'order'>>('../experiments/*/entry.json', {
    eager: true,
    import: 'default',
});

export const experiments: Experiment[] = Object.values(entries)
    .sort((first, second) => {
        if (first.id === 'collision-tunneling') return -1;
        if (second.id === 'collision-tunneling') return 1;
        return first.tags[0]!.localeCompare(second.tags[0]!, 'ko') || first.id.localeCompare(second.id);
    })
    .map((entry, index) => ({ ...entry, order: index + 1 }));
