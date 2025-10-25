
<template>
    <header>
        <h1 class="text-center">
            Might calculator
            <v-icon
                @click="exportSettingsCodeToClipboard()"
                size="24"
            >
                mdi-share-variant
            </v-icon>
        </h1>
    </header>

    <main>
        <!-- Settings -->
        <div class="settings">
            <v-text-field
                v-model="boonDuration"
                type="number"
                label="Boon duration"
                :step="0.01"
                :min="0"
                :max="100"
            />

            <v-slider
                v-model="precision"
                :label="`Precision (${precision.toFixed(2)}s)`"
                :min="0.05"
                :max="1"
                :step="0.01"
                hide-details
            />
            <v-slider
                v-model="loopDuration"
                :label="`Loop duration (${loopDuration.toFixed(1)}s)`"
                :min="5"
                :max="100"
                :step="0.5"
                hide-details
            />

            <v-slider
                v-model="loops"
                :label="`Loops (${loops})`"
                :min="1"
                :max="5"
                :step="1"
                hide-details
            />

            <v-checkbox
                v-model="clampMight"
                label="Realistic might cap"
                hide-details
            />

            <!-- Might sources -->
            <v-expansion-panels
                variant="accordion"
                multiple
            >
                <might-source-settings-expansion-panel
                    v-for="(mightSource, index) in mightSources"
                    :key="index"
                    :model-value="mightSource"
                    @update:model-value="(value) => mightSources[index] = value"
                    @delete="deleteSource(index)"
                    :second-inputs-precision="precision"
                />
            </v-expansion-panels>
            <v-btn
                style="width: 100%; margin-top: 10px;"
                @click.prevent="addSource()"
                prepend-icon="mdi-plus"
                color="success"
            >
                Add
            </v-btn>
        </div>

        <!-- Graph -->
        <div class="output">
            <Line
                class="graph"
                :data="graphData"
                :options="graphOpions"
            />
        </div>
    </main>
</template>

<script>
import {
    Chart,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'
import { Line } from 'vue-chartjs'
Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// import exampleMightSource from './assets/might-sources/outside-overload-fire.json';
// import exampleMightSource from './assets/might-sources/testing.json';
import exampleMightSource from './assets/might-sources/offset-heal-scourge.json';
import MightSourceTypes from './enums/MightSourceTypes.js';
import SkillUsageTypes from './enums/SkillUsageTypes.js';
import MightSourceSettingsExpansionPanel from './components/MightSourceSettingsExpansionPanel.vue';

export default {
    components: {
        MightSourceSettingsExpansionPanel,

        // These two components are needed for the graph to load in properly even if we don't use them directly.
        // eslint-disable-next-line vue/no-unused-components
        Window,
        // eslint-disable-next-line vue/no-reserved-component-names
        Line,
    },
    data() {
        return {
            soloData: [],
            groupData: [],

            mightSources: [],
            loops: 2,
            loopDuration: 24.5,
            precision: 0.5,
            clampMight: true,
            boonDuration: 0
        }
    },
    mounted() {
        // If we were passed a settings code we'll import it, otherwise we'll serve an example setup for the user so they don't have to start from zero.
        let urlParameters = new URLSearchParams(window.location.search);
        if(urlParameters.has("settings")) this.importSettingsCode(urlParameters.get("settings"));
        else this.mightSources = exampleMightSource;

        this.calculateGraphData();
    },
    methods: {
        calculateGraphData() {
            let soloData = [];
            let groupData = [];
            for (let time = 0; time <= this.loopDuration * this.loops; time += this.precision) {
                let roundedTime = time.toFixed(1);
                soloData.push({
                    x: roundedTime + "s",
                    y: Math.min(this.clampMight ? 25 : Number.MAX_VALUE, this.calculateMightAt(time, true).reduce((accumulator, source) => accumulator += source.amount, 0))
                });
                groupData.push({
                    x: roundedTime + "s",
                    y: Math.min(this.clampMight ? 25 : Number.MAX_VALUE, this.calculateMightAt(time).reduce((accumulator, source) => accumulator += source.amount, 0))
                });
            }
            this.soloData = soloData;
            this.groupData = groupData;
        },
        calculateMightAt(time, self = false) {
            const activeMightSources = this.mightSources.filter((source) => !source.disabled);
            let mightSources = [];

            // Add loop sources for every loop
            for (let loop = 0; loop < Math.ceil(time / this.loopDuration); loop++) {
                let loopSources = activeMightSources
                    .filter((source) => {
                        return source.usage === SkillUsageTypes.IN_LOOP
                    })
                    .map((source) => {
                        return {
                            "time": source.time + this.loopDuration * loop,
                            "amount": source.amount,
                            "duration": source.duration * this.boonDurationMultiplier,
                            "type": source.type,
                        };
                    });
                mightSources = mightSources.concat(loopSources);
            }

            // Add off-cd sources for every loop
            const offCdMightSources = activeMightSources.filter((source) => source.usage === SkillUsageTypes.OFF_CD);
            for (let sourceIndex = 0; sourceIndex < offCdMightSources.length; sourceIndex++) {
                const source = offCdMightSources[sourceIndex];
                if(source.cooldown === 0 || source.cooldown === null) continue; // Skip these 0 cooldown skills as it would create an infinite loop and they don't exist anyways

                for (let use = 0; source.offset + source.cooldown * use <= time; use++) {
                    mightSources.push({
                        "time": source.offset + source.cooldown * use,
                        "amount": source.amount,
                        "duration": source.duration * this.boonDurationMultiplier,
                        "type": source.type,
                    });
                }
            
            }

            // Add all one-off sources
            const oneOffMightSources = activeMightSources.filter((source) => source.usage === SkillUsageTypes.ONCE);
            for (let sourceIndex = 0; sourceIndex < oneOffMightSources.length; sourceIndex++) {
                const source = oneOffMightSources[sourceIndex];
                if(source.time <= time) {
                    mightSources.push({
                        "time": source.time,
                        "amount": source.amount,
                        "duration": source.duration * this.boonDurationMultiplier,
                        "type": source.type,
                    });
                }
            }

            // Insert all the might being shared
            let mightSourcesWithShares = mightSources
                .filter((source) => source.type !== MightSourceTypes.SELF || self)
                .filter((source) => source.time < time)
                .map((source) => {
                    // Counted only when calculating self might as otherwise the self type would be filtered out already
                    if (source.type == MightSourceTypes.SELF) return source;

                    // Without sharing it's just the amount of the source
                    if (source.type == MightSourceTypes.AOE) return source;

                    if (source.type == MightSourceTypes.HEAT_SYNC) {
                        // Never calculate the shared might for the player syncing as they never receive the shared might
                        if (self) return source;

                        // Calculate the might shared to allies
                        let mightShared = this.calculateMightAt(source.time, true);
                        mightShared.push(source); // Might generated is always added before sharing so we have to add it here as well
                        return mightShared;
                    }

                    // Unknown source type so we just throw an error and make a dummy might source
                    console.error("Unknown source type: " + source.type, source);
                    return {
                        "time": source.type,
                        "amount": 0,
                        "duration": 0,
                        "type": MightSourceTypes.AOE
                    }
                }).flat(1);

            // Calculate the current might
            let might = mightSourcesWithShares
                .map((source) => {
                    return {
                        "time": time,
                        "amount": source.amount,
                        "duration": source.time + source.duration - time,
                        "type": source.type,
                    }
                })
                .filter((source) => source.duration >= 0);

            return might;
        },
        deleteSource(index) {
            this.mightSources.splice(index, 1);
        },
        addSource() {
            let maxTime = Math.max(0, ...this.mightSources.filter((source) => !!source.time).map((source) => source.time));
            this.mightSources.push({
                "name": "New might source",
                "disabled": false,
                "usage": SkillUsageTypes.IN_LOOP,
                "time": maxTime,
                "cooldown": 0,
                "offset": 0,
                "amount": 0,
                "duration": 0,
                "type": MightSourceTypes.AOE,
            });
        },
        exportSettingsCodeToClipboard() {
            const settingsCode = btoa(JSON.stringify({
                loops: this.loops,
                loopDuration: this.loopDuration,
                precision: this.precision,
                sources: this.mightSources,
                boonDuration: this.boonDuration
            }));
            const link = `${window.location.protocol}//${window.location.host}?settings=${settingsCode}`;

            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(link);
                alert(`Successfully copied the settings link to your clipboard`);
            } else {
                alert(`Failed to automatically copy to your clipboard, you'll have to do it manually 😢\n\n${link}`);
            }
        },
        importSettingsCode(code) {
            let settings = JSON.parse(atob(code));
            this.loops = settings?.loops ?? 2;
            this.loopDuration = settings?.loopDuration ?? 24.5;
            this.precision = settings?.precision ?? 0.5;
            this.mightSources = settings?.sources ?? [];
            this.boonDuration = settings?.boonDuration ?? 0;
        },
    },
    computed: {
        graphData() {
            return {
                parsing: false,
                aspectRatio: 1,
                datasets: [
                    {
                        label: "Self",
                        borderColor: "#00FF00",
                        backgroundColor: "#00000000",
                        data: this.soloData
                    },
                    {
                        label: "Group",
                        borderColor: "#FF0000",
                        backgroundColor: "#00000000",
                        data: this.groupData
                    },
                ]
            };
        },
        graphOpions() {
            return {
                scales: {
                    x: {

                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: 25
                    }
                }
            }
        },
        boonDurationMultiplier() {
            return 1 + (this.boonDuration / 100);
        }
    },
    watch: {
        mightSources: {
            handler: function () {
                this.calculateGraphData()
            },
            deep: true,
        },
        loopDuration: {
            handler: function () {
                this.calculateGraphData()
            },
        },
        loops: {
            handler: function () {
                this.calculateGraphData()
            },
        },
        precision: {
            handler: function () {
                this.calculateGraphData()
            },
        },
        clampMight: {
            handler: function () {
                this.calculateGraphData()
            },
        },
        boonDuration: {
            handler: function () {
                this.calculateGraphData()
            },
        }
    }
}
</script>

<style scoped>
main {
	max-width: 1500px;
	margin-left: auto;
	margin-right: auto;
	padding: 24px;

	display: flex;
	flex-direction: row;
	justify-content: center;
    align-items: stretch;
	gap: 24px 24px;
}

.settings {
	flex-basis: 700px;
	flex-grow: 1;
}

.output {
	flex-basis: 600px;
	flex-grow: 2;
}

.graph {
	width: 100% !important;
	height: auto !important;
    position: sticky;
    top: 24px;
}
</style>