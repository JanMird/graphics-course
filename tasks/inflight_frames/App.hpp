#pragma once

#include <etna/Etna.hpp>
#include <etna/Window.hpp>
#include <etna/PipelineManager.hpp>
#include <etna/PerFrameCmdMgr.hpp>
#include <etna/Profiling.hpp>
#include <etna/ComputePipeline.hpp>
#include <etna/GraphicsPipeline.hpp>
#include <etna/Image.hpp>
#include <etna/Sampler.hpp>
#include <etna/GlobalContext.hpp>
#include <etna/RenderTargetStates.hpp>
#include <etna/BlockingTransferHelper.hpp>
#include <chrono>
#include <ctime>
#include <stb_image.h>

#include "wsi/OsWindowingManager.hpp"


class App
{
public:
  App();
  ~App();

  void run();

private:
  void drawFrame();

  OsWindowingManager windowing;
  std::unique_ptr<OsWindow> osWindow;

  glm::uvec2 resolution;
  bool useVsync;

  glm::uvec2 textureResolution;


  std::unique_ptr<etna::Window> vkWindow;
  std::unique_ptr<etna::PerFrameCmdMgr> commandManager;
  std::unique_ptr<etna::OneShotCmdMgr> oneShotManager;

  etna::GraphicsPipeline pipeline;
  etna::GraphicsPipeline texturePipeline;
  etna::Image textureImage;
  etna::Image image;
  etna::Sampler sampler;


  etna::Sampler graphicsSampler;

  static constexpr size_t framesNum = 3;
  struct Params {
    glm::uvec2 resolution;
    glm::ivec2 mousePos;
  };
  etna::Buffer params[framesNum];
  size_t currentBuffer = 0;
  bool initFlag = false;
};