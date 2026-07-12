EV Guardian — Native Android App (Qualcomm Snapdragon Mobile) 📱🔋 

📖 Application Description

This module is the mobile <mark>edge-AI</mark> companion of the EV Guardian platform. It brings real-time battery telemetry, 3D battery-pack visualization, voice/chat assistance, and — most importantly — <mark>on-device (edge) anomaly detection</mark> straight to the driver's <mark>Snapdragon-powered</mark> phone.

It is composed of two parts:


client/ — a native <mark>Jetpack Compose</mark> Android application that renders live BMS telemetry, a 3D EV twin, and an AI assistant, and runs a local fault-classification model directly on the <mark>Snapdragon SoC</mark>.
server/ — a lightweight <mark>Kotlin/Ktor</mark> backend used to relay/serve mobile-specific data alongside the main Python backend.



Design Goal: Safety without a connectivity dependency — even if Wi-Fi/cellular drops or the cloud server is unreachable, the phone keeps scoring incoming battery telemetry locally, on-device, in real time.




🧠 AI on Qualcomm: Model, Runtime & Why

What runs on-device

DetailModel filebms_anomaly.onnx (dropped into client/app/src/main/assets/)Task<mark>4-class</mark> real-time fault classification: Normal, Overtemp, Cell Imbalance, Gas HazardInputs<mark>9-feature</mark> telemetry vector — 4 cell voltages, pack current, 2 temperature sensors, gas (ppm), vibrationRuntime<mark>ONNX Runtime Mobile</mark> for Android v1.20.0 (onnxruntime-android)Target hardwareQualcomm Snapdragon mobile SoC (CPU/GPU/<mark>Hexagon NPU</mark> via ONNX Runtime execution providers)

Why an on-device ONNX classifier (and not a cloud call)?


Zero-latency safety loop — a thermal runaway or gas leak needs a <mark>sub-second local decision</mark>, not a round-trip to a server.
Offline resilience — the app is explicitly designed to keep classifying battery health even with <mark>Wi-Fi turned off</mark> (see Tests below); a cloud-only model can't do that.
Energy & resource efficiency — the model is a compact classifier (9 → 4) intentionally kept small so it can run continuously on a phone's NPU/CPU without draining the battery, which directly aligns with the <mark>"resource utilization, latency, and energy efficiency"</mark> judging criteria for Snapdragon edge deployment.
Privacy — raw sensor telemetry <mark>never has to leave the device</mark> for a safety classification to be produced.


Qualcomm AI Hub — optimizing and deploying bms_anomaly.onnx

Rather than shipping a hand-tuned model, this module is built to plug into the <mark>Qualcomm® AI Hub</mark> workflow to <mark>compile, profile, and validate</mark> bms_anomaly.onnx for real Snapdragon hardware before it ever ships in the APK:

bashpip install qai-hub qai-hub-models
qai-hub configure --api_token <YOUR_QUALCOMM_AI_HUB_TOKEN>

# Profile / compile the trained BMS classifier for a target Snapdragon device
qai-hub submit-compile-job \
  --model bms_anomaly.onnx \
  --device "Snapdragon 8 Elite (Family)" \
  --target-runtime onnx

# Profile on a real, cloud-hosted Snapdragon device to measure on-NPU latency & memory
qai-hub submit-profile-job --model <compiled-model-id> --device "Snapdragon 8 Elite (Family)"

This gives concrete, <mark>hardware-verified latency/memory numbers</mark> on Hexagon NPU (rather than only a phone-side estimate) and lets the model be re-compiled per target runtime (ONNX Runtime QNN Execution Provider, TFLite, etc.) without touching app code — the app only ever needs to load whatever .onnx file is exported into assets/.


Two Paths, One Platform: This companions the sibling Qualcomm Arduino Uno Q module in this repo, which uses ready-made <mark>Qualcomm AI Hub Models</mark> (FaceDetLite, FaceAttribNet) for driver-drowsiness detection — together the two modules show both paths Qualcomm AI Hub supports: (1) deploying pre-built AI Hub models, and (2) <mark>compiling/profiling a custom-trained model</mark> for Snapdragon, which is what this Mobile module does for battery safety.




🚀 Setup & Installation Instructions

Prerequisites: Android Studio, JDK 17, an Android device/emulator running API 26+, Node/Python (for main server).

1. Mobile Server (Ktor):

bashcd server
./gradlew build

2. Android App:


Open Android Studio.
Click Open and select the client/app folder.
Allow Gradle to sync and download all necessary Android SDK components and the onnxruntime-android dependency.
Update SERVER_URL in BmsViewModel.kt to match your PC's local IP address.
Place your compiled/exported bms_anomaly.onnx model into client/app/src/main/assets/ (see the <mark>Qualcomm AI Hub</mark> section above for how to compile it).


🏃 Run and Usage Instructions

Run the Mobile Server:

bashcd server
./gradlew run

Run the Android App:


Ensure an Android Emulator is running, or a physical Snapdragon device is connected via USB (recommended, to exercise the real <mark>Hexagon NPU</mark> path).
Click the Run (Play) button in Android Studio.
The app will launch and connect via Socket.IO to the live telemetry stream, and immediately begin running bms_anomaly.onnx inference <mark>locally</mark> on every incoming reading.
The Assistant tab surfaces both the cloud diagnosis and the local ONNX result (ONNX Local Result: <label> (<confidence>%)) side by side.


🧪 Tests


Edge-only test: Turn off your phone's Wi-Fi to test the local Edge capabilities. The local ONNX model within the Android app will <mark>continue to score</mark> historical telemetry cached on the device, proving <mark>true on-device inference</mark>.
Fault-injection test: Drive the simulator/hardware to push temperature, gas, or cell-imbalance values into abnormal ranges and confirm the ONNX result label switches from Normal to the correct fault class <mark>in real time</mark>.
Push notification test: Verify push notifications trigger when the Ktor server broadcasts a severe fault, <mark>independent of the local ONNX path</mark>.


📝 Notes & References


Edge Native: The Android app runs anomaly detection locally on the Snapdragon processor, demonstrating a <mark>hybrid edge-cloud approach</mark>.
Qualcomm AI Hub: aihub.qualcomm.com — used to <mark>compile and profile</mark> bms_anomaly.onnx for target Snapdragon devices (see workflow above).
ONNX Runtime Mobile: onnxruntime.ai — executes the compiled model on-device, able to leverage Qualcomm's <mark>QNN Execution Provider</mark> to route inference to the Hexagon NPU.
References: Built natively using Kotlin and Jetpack Compose, with Ktor for the mobile backend.
Code contains extensive documentation detailing view states, ONNX session lifecycle, and Socket connections.
