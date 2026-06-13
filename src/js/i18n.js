window.STELLAR_I18N = {
  zh: {
    eyebrow: "MIST v2.5 / 单星轨迹",
    title: "恒星演化路径",
    dataNotes: "数据说明",
    nowViewing: "当前恒星",
    hrDiagram: "赫罗图",
    chartTitle: "温度与光度轨迹",
    overlayTracks: "叠加全部轨迹",
    initialMass: "初始质量",
    age: "年龄",
    temperature: "有效温度",
    luminosity: "光度",
    radius: "半径",
    surfaceGravity: "表面重力",
    remainingMass: "当前质量",
    stage: "演化阶段",
    scienceNote: "这是基于 MIST 预计算单星模型的科普可视化，不是实时物理模拟；双星相互作用、磁场和任意参数调节不在第一版范围内。",
    xAxis: "log Teff [K]，高温在左",
    yAxis: "log L / L☉",
    mainSequenceBand: "主序带",
    whiteDwarfRegion: "白矮星区",
    neutronStarRegion: "中子星尺度",
    blackHoleRegion: "黑洞结局",
    compactObjectHint: "致密残骸不在普通 HR 图尺度内；这里仅标示可能结局。",
    loading: "正在加载 MIST 轨迹...",
    loadError: "轨迹数据加载失败。请通过本地静态服务器打开本项目。",
    play: "播放",
    pause: "暂停",
    stages: {
      pms: {
        name: "主序前",
        description: "恒星仍在收缩，核心温度上升，逐步接近稳定的氢燃烧阶段。"
      },
      main_sequence: {
        name: "主序星",
        description: "核心氢聚变提供主要能量。质量越高，越明亮也越短命。"
      },
      subgiant_red_giant: {
        name: "亚巨星 / 红巨星",
        description: "核心氢耗尽后，外层膨胀、表面降温，轨迹向赫罗图右上方移动。"
      },
      red_giant_tip: {
        name: "红巨星顶端",
        description: "低质量恒星接近氦点火，高质量恒星对应明亮而膨胀的后主序阶段。"
      },
      core_helium_burning: {
        name: "核心氦燃烧",
        description: "核心开始把氦合成为更重元素，恒星结构重新调整，轨迹可能出现回环。"
      },
      tp_agb: {
        name: "热脉冲 AGB",
        description: "晚期低/中质量恒星经历壳层燃烧和强质量损失，外层逐渐被剥离。"
      },
      post_agb: {
        name: "后 AGB",
        description: "包层所剩无几，恒星快速变热，准备进入白矮星冷却序列。"
      },
      white_dwarf: {
        name: "白矮星冷却",
        description: "核聚变停止，残骸依靠余热缓慢变暗变冷。"
      },
      post_main_sequence: {
        name: "后主序",
        description: "大质量恒星离开主序，外层急剧重排，光度保持极高。"
      },
      red_supergiant: {
        name: "红超巨星",
        description: "大质量恒星外层膨胀成超巨星，半径可达太阳的数百到上千倍。"
      },
      carbon_burning: {
        name: "碳燃烧前后",
        description: "大质量恒星进入高级燃烧阶段，模型终点接近核心坍缩前的演化。"
      }
    }
  },
  en: {
    eyebrow: "MIST v2.5 / single-star tracks",
    title: "Stellar Evolution Paths",
    dataNotes: "Data notes",
    nowViewing: "Now viewing",
    hrDiagram: "Hertzsprung-Russell diagram",
    chartTitle: "Temperature and luminosity track",
    overlayTracks: "Overlay all tracks",
    initialMass: "Initial mass",
    age: "Age",
    temperature: "Effective temperature",
    luminosity: "Luminosity",
    radius: "Radius",
    surfaceGravity: "Surface gravity",
    remainingMass: "Current mass",
    stage: "Evolutionary stage",
    scienceNote: "This is a public-facing visualization based on precomputed MIST single-star models, not a live physics simulation. Binaries, magnetic fields, and arbitrary parameter controls are outside v1.",
    xAxis: "log Teff [K], hotter to the left",
    yAxis: "log L / L☉",
    mainSequenceBand: "Main sequence band",
    whiteDwarfRegion: "White dwarf region",
    neutronStarRegion: "Neutron-star scale",
    blackHoleRegion: "Black-hole endpoint",
    compactObjectHint: "Compact remnants are not ordinary HR-diagram objects; these markers only indicate likely endpoints.",
    loading: "Loading MIST tracks...",
    loadError: "Could not load track data. Open the project through a local static server.",
    play: "Play",
    pause: "Pause",
    stages: {
      pms: {
        name: "Pre-main sequence",
        description: "The star is still contracting as its core temperature rises toward stable hydrogen burning."
      },
      main_sequence: {
        name: "Main sequence",
        description: "Core hydrogen fusion powers the star. Higher-mass stars are brighter and much shorter-lived."
      },
      subgiant_red_giant: {
        name: "Subgiant / red giant",
        description: "After core hydrogen exhaustion, the envelope expands and cools while the track moves up and right."
      },
      red_giant_tip: {
        name: "Red giant tip",
        description: "Low-mass stars approach helium ignition; massive stars pass through a bright expanded post-main-sequence state."
      },
      core_helium_burning: {
        name: "Core helium burning",
        description: "Helium fusion begins in the core and the stellar structure readjusts, often producing loops in the track."
      },
      tp_agb: {
        name: "Thermal-pulse AGB",
        description: "Late low- and intermediate-mass stars undergo shell burning and strong mass loss."
      },
      post_agb: {
        name: "Post-AGB",
        description: "With little envelope left, the star heats rapidly on its way to the white dwarf cooling sequence."
      },
      white_dwarf: {
        name: "White dwarf cooling",
        description: "Fusion has ended; the remnant fades and cools using stored heat."
      },
      post_main_sequence: {
        name: "Post-main sequence",
        description: "A massive star leaves the main sequence and reorganizes while remaining extremely luminous."
      },
      red_supergiant: {
        name: "Red supergiant",
        description: "The envelope expands to enormous size while the surface cools."
      },
      carbon_burning: {
        name: "Carbon-burning stage",
        description: "A massive star reaches advanced burning stages; the model endpoint approaches pre-collapse evolution."
      }
    }
  }
};
