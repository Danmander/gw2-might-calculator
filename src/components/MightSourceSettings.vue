<template>
    <v-row dense>
        <v-col cols="6">
            <v-text-field
                :model-value="modelValue.name"
                @update:model-value="(value) => updateValue('name', value)"
                type="text"
                label="Name"
                density="compact"
                hide-details
            />
        </v-col>
        <v-col cols="6">
            <v-select
                label="Usage"
                :model-value="modelValue.usage"
                @update:model-value="(value) => updateValue('usage', value)"
                :items="skillUsageTypesOptions"
                item-title="label"
                item-value="value"
                hide-details
            />
        </v-col>
        <v-col
            v-if="modelValue.usage === SkillUsageTypes.IN_LOOP"
            cols="6"
        >
            <v-text-field
                :model-value="modelValue.time"
                @update:model-value="(value) => updateValue('time', parseFloat(value))"
                type="number"
                label="Time"
                density="compact"
                :step="precision"
                hide-details
            />
        </v-col>
        <v-col
            cols="6"
            v-if="modelValue.usage === SkillUsageTypes.OFF_CD"
        >
            <v-text-field
                :model-value="modelValue.cooldown"
                @update:model-value="(value) => updateValue('cooldown', parseFloat(value))"
                type="number"
                label="Cooldown"
                density="compact"
                :step="precision"
                hide-details
            />
        </v-col>
        <v-col
            v-if="modelValue.usage === SkillUsageTypes.OFF_CD"
            cols="6"
        >
            <v-text-field
                :model-value="modelValue.offset"
                @update:model-value="(value) => updateValue('offset', parseFloat(value))"
                type="number"
                label="Offset"
                density="compact"
                :step="precision"
                hide-details
            />
        </v-col>
        <v-col cols="6">
            <v-text-field
                :model-value="modelValue.amount"
                @update:model-value="(value) => updateValue('amount', parseInt(value))"
                type="number"
                label="Amount"
                density="compact"
                step="1"
                hide-details
            />
        </v-col>
        <v-col cols="6">
            <v-text-field
                :model-value="modelValue.duration"
                @update:model-value="(value) => updateValue('duration', parseFloat(value))"
                type="number"
                label="Duration"
                density="compact"
                :step="precision"
                hide-details
            />
        </v-col>
        <v-col cols="12">
            <v-select
                :model-value="modelValue.type"
                @update:model-value="(value) => updateValue('type', value)"
                :items="mightSourceTypesOptions"
                item-title="label"
                item-value="value"
                hide-details
            />
        </v-col>
    </v-row>
</template>

<script>
import MightSourceTypes from '../enums/MightSourceTypes.js';
import SkillUsageTypes from '../enums/SkillUsageTypes.js';

export default {
    emits: ["update:modelValue"],
    props: {
        modelValue: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            SkillUsageTypes,
            skillUsageTypesOptions: [
                { label: "In loop", value: SkillUsageTypes.IN_LOOP },
                { label: "Off cooldown", value: SkillUsageTypes.OFF_CD },
            ],
            MightSourceTypes,
            mightSourceTypesOptions: [
                { label: 'Self might', value: MightSourceTypes.SELF },
                { label: 'Aoe might', value: MightSourceTypes.AOE },
                { label: 'Heat sync', value: MightSourceTypes.HEAT_SYNC },
            ],
        }
    },
    methods: {
        updateValue(key, value) {
            this.$emit("update:modelValue", { ...this.modelValue, [key]: value });
        }
    }
}
</script>

<style>
</style>