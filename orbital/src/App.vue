<template>
  <OrbitalViewPort />
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import OrbitalViewPort from './components/OrbitalViewPort.vue';

@Options({
  components: {
    OrbitalViewPort,
  },
})
export default class App extends Vue {}
</script>

<style>
html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  margin: 0;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  width: 100%;
  height: 100%;
}
</style>
