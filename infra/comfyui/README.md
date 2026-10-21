# ComfyUI: local image generation on the RTX 4070

This is for making fan art of **Persona 5** and **Cyberpunk: Edgerunners 2** characters on your own PC, using an RTX 4070 with 12 GB of VRAM.

**This stays on your PC.** Don't run it on the VM: it has no GPU, and ComfyUI has no real login, so it shouldn't be on the internet.
There's no `compose.yml` here on purpose.

Checked on 2026-10-21: ComfyUI v0.42.x, ComfyUI Desktop v0.9.x, kohya_ss GUI v26.0.0 (sd-scripts v0.12.x), and OneTrainer (rolling `master` branch, no version numbers).

## 1. Install ComfyUI (Windows 11)

Pick **one** of these:

**A. ComfyUI Desktop (easiest).** Download the Windows (NVIDIA) installer from [comfy.org/download](https://www.comfy.org/download) and run it.
It sets up Python and PyTorch for you, includes ComfyUI-Manager (for installing custom nodes), and updates itself.
During setup it asks where to keep models and outputs. Pick a drive with **100 GB or more free**, because models are 2–7 GB each.

**B. Windows portable build (more control, updates sooner).**

1. Update your NVIDIA driver (GeForce/NVIDIA App → Drivers). The current portable build uses CUDA 13.0 and won't start on old drivers.
2. Download [`ComfyUI_windows_portable_nvidia.7z`](https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia.7z) and extract it with 7-Zip
   to a short path such as `D:\ComfyUI`. If extracting fails, right-click the file **→ Properties → Unblock** and try again.
3. Double-click `run_nvidia_gpu.bat`. A browser tab opens at http://127.0.0.1:8188.
4. ComfyUI-Manager: if you don't see a **Manager** button, run this once in the ComfyUI folder:
   ```bat
   .\python_embeded\python.exe -m pip install -r ComfyUI\manager_requirements.txt
   ```
   Then add `--enable-manager` to the end of the `python` line in `run_nvidia_gpu.bat`.
5. To update, run `update\update_comfyui.bat`.

**On Linux,** clone the repo, create a venv, install PyTorch using the command in the
[ComfyUI README](https://github.com/comfyanonymous/ComfyUI#manual-install-windows-linux) (it changes with CUDA versions), then run `pip install -r requirements.txt` and `python main.py`.

**Where models go** (inside the models folder you chose, or `ComfyUI\models\` for the portable build):

| Folder | What goes there |
| --- | --- |
| `checkpoints/` | Base models (`.safetensors`, about 6.5 GB for SDXL) |
| `loras/` | LoRAs (usually 20–200 MB) |
| `vae/` | A separate VAE, only if a model card asks for one |
| `controlnet/` | ControlNet models |
| `upscale_models/` | Upscalers such as 4x-AnimeSharp |
| `clip_vision/`, `ipadapter/` | IP-Adapter files |

Only download `.safetensors` files. Avoid `.ckpt`/`.pt` files from people you don't know, because those can run code when loaded.

## 2. Which base model?

With 12 GB of VRAM and an anime style, use an **SDXL-family anime model**. They fit easily, generate a 1024px image in about 5–10 seconds on a 4070, and have by far the most LoRAs available.

| Model | Notes |
| --- | --- |
| **Illustrious-XL** (OnomaAI) | Anime base trained on Danbooru-style tags. It knows many popular characters by name. Public versions on Hugging Face are v0.1, v1.0, v1.1 and v2.0 ([OnomaAIResearch](https://huggingface.co/OnomaAIResearch)). OnomaAI has announced newer versions too; I couldn't confirm which is current or how to get it, so check their pages. |
| **NoobAI-XL** (Laxhar Dream Lab) | Based on Illustrious, trained further on more Danbooru and e621 data. Comes as **eps** (`noobai-XL-1.1`, the easy one) and **v-pred** (`noobai-XL-Vpred-1.0`, better colour and contrast but more setup, see below). |
| **Fine-tunes and merges of these** | Most of what people use day to day. Search Civitai and filter by base model "Illustrious" or "NoobAI". Usually the simplest place to start. |

- **v-pred models** need a **ModelSamplingDiscrete** node (sampling `v_prediction`, `zsnr` on) between the checkpoint and the sampler. Without it, images come out grey or fried.
  Start with an eps model and try v-pred later.
- **Flux.1** (and newer large models) only fit in 12 GB as **fp8** or **GGUF** (Q4–Q8) versions, using the ComfyUI-GGUF custom node. The trade-offs:
  it's 2–4 times slower than SDXL, knows far fewer anime characters, has fewer anime LoRAs, and training a LoRA on 12 GB is tight.
  It's better at text and hands. It's worth a try later, but it's not the starting point here. Flux.1-dev's licence doesn't allow commercial use.

**Where to get models:** [Civitai](https://civitai.com) (models, LoRAs and example images with their settings) and [Hugging Face](https://huggingface.co).

**Check every licence.** Each model and LoRA page lists one: Illustrious v1.0 uses a custom licence and v2.0 uses CreativeML OpenRAIL-M,
NoobAI has its own terms, and Civitai uploaders set their own rules (for example "no selling images" or "credit required").
Fan art of game and anime characters is generally fine as a personal, non-commercial hobby. Selling it is a different matter.

## 3. Your first image

Open **Workflow → Browse Templates** and pick the basic SDXL text-to-image template, or build this chain yourself:

```
Load Checkpoint ─┬─ CLIP Text Encode (positive) ─┐
                 ├─ CLIP Text Encode (negative) ─┼─ KSampler ── VAE Decode ── Save Image
                 └─ model ───────────────────────┘     ▲
                    Empty Latent Image (832 × 1216) ───┘
```

Starting settings for Illustrious and NoobAI models (use the model card's settings if they differ):

| Setting | Value |
| --- | --- |
| Size | 832×1216 (portrait), 1216×832 (landscape), 1024×1024 |
| Steps | 25–30 |
| CFG | 5–7 (v-pred: 3.5–5.5) |
| Sampler / scheduler | `euler_ancestral` / `normal` |
| Seed | random. Fix it once you like a composition |

These models understand Danbooru-style tags better than sentences:

```
Positive:
masterpiece, best quality, 1girl, adult, niijima makoto, persona 5, brown hair, short hair, braid, red eyes,
black leather jacket, white shirt, jeans, standing, arms crossed, confident smile, city street, night,
neon lights, looking at viewer, upper body

Negative:
lowres, worst quality, low quality, bad anatomy, bad hands, extra fingers, missing fingers,
text, watermark, signature, nsfw
```

For Sae, try `niijima sae, persona 5, long hair, grey hair, business suit, office`. To get the right look, copy the tag names
from the character's Danbooru page.

**Edgerunners 2 characters** are probably too new for these base models to know. For them, use a character **LoRA**:
download one from Civitai, or train your own (section 6). Add a **Load LoRA** node between Load Checkpoint and the rest,
start with a strength of 0.7–0.9, and put the LoRA's trigger word in the prompt.

ComfyUI saves the workflow inside each PNG it creates. Drag a PNG back onto the canvas to reload its exact settings.

## 4. Upscaling

1. **Hi-res fix (best quality).** Take the result → **Upscale Image (using Model)** with an anime upscaler (for example `4x-AnimeSharp`
   or `RealESRGAN_x4plus_anime_6B` from [OpenModelDB](https://openmodeldb.info)) → **Upscale Image By** 0.375 (so the 4× model works out to 1.5× overall)
   → **VAE Encode** → a second **KSampler** with the same prompt, **denoise 0.35–0.5** and 15–20 steps → VAE Decode. This adds real detail.
2. **Just bigger:** use only the upscale model, with no second sampler. It's fast, but it doesn't add detail.
3. **Very large (4K and up):** the **Ultimate SD Upscale** custom node (install it from the Manager) works tile by tile, so it fits in 12 GB.

## 5. Poses and consistent characters

**ControlNet (poses, composition).** Install **comfyui_controlnet_aux** from the Manager to get the preprocessors (OpenPose, Depth, Lineart).
For models, use an SDXL ControlNet that works with anime bases: NoobAI's own ControlNets (for example
[`Laxhar/noob_openpose`](https://huggingface.co/Laxhar/noob_openpose)) or the general
[`xinsir/controlnet-union-sdxl-1.0`](https://huggingface.co/xinsir/controlnet-union-sdxl-1.0).
Chain them like this: Load Image (your pose reference) → OpenPose preprocessor → **Apply ControlNet** (strength 0.6–0.9, end 0.8) → KSampler.
You can also pose a 3D figure in a free posing app and use a screenshot as the reference.

**IP-Adapter (match a reference image's look or outfit).** The usual node pack is **ComfyUI_IPAdapter_plus**. Its author has
said it gets little active development now, so check the Manager or GitHub for its current status before relying on it. Use the SDXL "ViT-H" IP-Adapter models
plus the matching CLIP Vision model, with a weight of 0.5–0.8. It helps with outfit and colours. For a face and character that stay the same across many images,
a **LoRA is more reliable** than IP-Adapter.

## 6. Train your own character or style LoRA (12 GB)

### Which tool

- **kohya_ss GUI** ([bmaltais/kohya_ss](https://github.com/bmaltais/kohya_ss), v26.0.0) is a web UI on top of kohya's
  [sd-scripts](https://github.com/kohya-ss/sd-scripts). It's the most widely used, and most Civitai guides use its names for settings. **This guide uses it.**
- **OneTrainer** ([Nerogar/OneTrainer](https://github.com/Nerogar/OneTrainer)) is a desktop app with good presets, including SDXL presets that fit 12 GB. Run `install.bat`, then `start-ui.bat`.
  The settings below mean the same things there.

**Installing kohya_ss on Windows** (from its `docs/Installation/uv_windows.md`). Install
[Python 3.11.9](https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe) and tick "Add to PATH". Also install [Git](https://git-scm.com/download/win),
the [CUDA 12.8 Toolkit](https://developer.nvidia.com/cuda-12-8-0-download-archive) and the [VC++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe). Then:

```powershell
cd D:\
git clone --recursive https://github.com/bmaltais/kohya_ss.git
cd kohya_ss
.\gui-uv.bat          # answer Y to install uv the first time; the UI opens at http://127.0.0.1:7860
```

On Linux, run `./gui-uv.sh` instead.

### Dataset

- **Character:** 20–40 good images. Use different poses, angles, expressions, outfits and backgrounds, with a few close-ups and a few full-body shots.
  For a brand-new character (like Edgerunners 2), use official screenshots and promotional art. Quality matters more than quantity: no blur, no heavy compression, no text over the character.
- **Style:** 50–150 images in one consistent style. Train on **your own art**, or on a broad style (for example "90s anime screencap") drawn from many sources,
  **not** on one living artist's work to copy them.
- Crop so the subject fills most of the image. Images should be at least 1024 px on the short side if possible. Smaller ones still work, but they look softer.

Folder layout. The number in front is how many times each image repeats per epoch:

```
D:\lora\mychar\
  img\
    8_mychar\          ← images + one .txt caption per image (same file name)
  out\
```

### Captions with the WD14 tagger

In the kohya GUI, go to **Utilities → Captioning → WD14 Captioning**. Set the folder to `img\8_mychar`, the model to `SmilingWolf/wd-eva02-large-tagger-v3`
(or `wd-swinv2-tagger-v3`), the threshold to about 0.35, and **Prefix to add** to your trigger word (for example `mychar`, a made-up word the model doesn't already know).

Then edit the captions. A tool like BooruDatasetTagManager makes this quicker.
- **Remove tags for things that are always true for the character** (hair colour, eye colour, a scar, a signature jacket). They get absorbed into the trigger word.
- **Keep tags for things that change** (pose, background, expression, a different outfit). That way you can change them later.
- For a style LoRA, keep the content tags and leave the style out of the captions. The trigger word carries the style.

### Settings that fit 12 GB

Train on the **base model** you'll generate with (for example the NoobAI eps model or Illustrious v1.0). A LoRA trained on the base also works on most fine-tunes made from it.

| Setting (kohya GUI name) | Character | Style | Why |
| --- | --- | --- | --- |
| Model | SDXL checkpoint, tick **SDXL** | same | |
| Resolution | 1024,1024, **Enable buckets** on | same | Buckets keep non-square images uncropped |
| Network rank (dim) / alpha | 16 / 8 | 32 / 16 | Higher rank = more capacity and a bigger file |
| Optimizer | AdamW8bit | AdamW8bit | Uses little VRAM |
| Learning rate (U-Net) | 1e-4 | 1e-4 | |
| Train U-Net only | on | on | Lets you cache text encoder outputs. Saves about 2 GB of VRAM |
| Cache latents (to disk) | on | on | Saves VRAM and time |
| Cache text encoder outputs | on | on | |
| LR scheduler | cosine, 5% warmup | cosine | |
| Batch size | 2 | 2 | Use 1 if you run out of memory |
| Repeats × images × epochs | about 1,500–2,500 steps total | about 3,000–5,000 | For example 30 images × 8 repeats × 10 epochs ÷ batch 2 = 1,200 steps |
| Epochs / save every | 10–12 / 2 | 10–15 / 2 | Compare the saved epochs and keep the best |
| Mixed precision / save precision | **bf16** / bf16 | same | The 4070 supports bf16. Use fp16 if a tool asks for it |
| Gradient checkpointing | **on** | on | Needed to fit SDXL in 12 GB |
| Attention | SDPA | SDPA | |
| Min SNR gamma | 5 | 5 | Makes training more stable |
| v-pred base only | tick **v_parameterization** + **zero_terminal_snr** | same | Only if the base is a v-pred model |

The same setup from the command line (sd-scripts, run inside the kohya venv):

```toml
# D:\lora\mychar\dataset.toml
[general]
enable_bucket = true
caption_extension = ".txt"

[[datasets]]
resolution = 1024
batch_size = 2

  [[datasets.subsets]]
  image_dir = 'D:\lora\mychar\img\8_mychar'
  num_repeats = 8
```

```bat
accelerate launch --num_cpu_threads_per_process 1 sdxl_train_network.py ^
  --pretrained_model_name_or_path="D:\models\checkpoints\noobai-XL-1.1.safetensors" ^
  --dataset_config="D:\lora\mychar\dataset.toml" ^
  --output_dir="D:\lora\mychar\out" --output_name="mychar" --save_model_as=safetensors ^
  --network_module=networks.lora --network_dim=16 --network_alpha=8 ^
  --network_train_unet_only --cache_text_encoder_outputs --cache_latents --cache_latents_to_disk ^
  --optimizer_type=AdamW8bit --learning_rate=1e-4 --lr_scheduler=cosine --lr_warmup_steps=60 ^
  --max_train_epochs=10 --save_every_n_epochs=2 ^
  --mixed_precision=bf16 --save_precision=bf16 --gradient_checkpointing --sdpa ^
  --min_snr_gamma=5 --seed=42
```

On Linux, replace the `^` line endings with `\` and use `/` in the paths.

**How long it takes:** with these settings, expect roughly **1–2 seconds per step** on a 4070. That's about **30–60 minutes** for a 1,500-step character LoRA
and 1–2 hours for a style LoRA. This is an estimate: it depends on batch size and the dataset. Close games and browsers while training.
If you get *CUDA out of memory*, set batch size to 1 first, then lower the rank.

**Testing:** copy the saved epochs into `ComfyUI\models\loras`. Generate the same prompt and seed with each one at strength 0.8, and keep the one that looks like the character
without copying the training images exactly (copying exactly means it's overtrained, so use an earlier epoch).

## 7. Posting

Most sites ask you to mark AI images. pixiv has an "AI-generated" setting on upload, DeviantArt and Civitai have AI labels, and on X a note
in the post (for example "#AIart") does the job. Label your posts. People are friendlier to AI art that's open about it, and it keeps your account safe.
Be respectful of artists: don't train on, or prompt for, one living artist's work to imitate their style. Keep the characters as the adults they are, and keep it SFW where the site expects that.
