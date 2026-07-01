DEMO LEARNING OBJECTIVES

UNIT 1: INTRO

Summary: Students should learn to frame AI systems as input-output prediction or ranking tasks, identify the inputs, outputs, labels, and representations used in common applications, and interpret model outputs such as class probabilities, recommendations, and summaries critically. The demos also introduce recurring concerns that appear throughout the course: preprocessing, distribution shift, latent features, evaluation, faithfulness, cold start, and bias, to name a few.

Image Classification Demo
Link: intro/image_classification_demo.html

A pretrained image-classification example that maps image inputs to predicted class probabilities. The goal is to help students identify image features and labels, interpret top-k predictions, and reason about normalization and distribution shift. In the demo, students inspect the displayed image-classification output and use the results to discuss what the model appears to recognize and where the prediction might fail.

Recommendation Systems Demo
Link: intro/recommendation_systems_demo.html

A simple recommendation interface using user IDs and movie-title inputs. The goal is to help students understand users, items, interactions, latent features, explicit and implicit feedback, cold start, and recommendation bias. In the demo, students enter a user ID or comma-separated movie titles, run "Recommend", and compare the resulting recommendations.

Text Summarization Demo
Link: intro/text_summarization_demo.html

A text summarization interface with adjustable summary size. The goal is to help students frame summarization as an input-output task and compare text representations, summary quality, faithfulness, and frequency-based bias. In the demo, students choose a summary size, run "Summarize", and inspect how the selected sentences change.

UNIT 2: MODELING

Demos: No current "web-html/demos" directory is clearly assigned to this unit.

Summary: Potential demo-addressable objectives from Chapter 2 include helping students treat machine learning development as an intentional design process rather than trial-and-error. Students should learn to specify a task in terms of users, inputs, outputs, constraints, risks, and success criteria; decide whether machine learning is appropriate for a problem; distinguish supervised, unsupervised, generative, ranking, explainable, randomized, and adaptive learning setups; and connect those choices to the data, model architecture, metric, training process, and deployment setting.

UNIT 3: DATA

Demos: No current "web-html/demos" directory is clearly assigned to this unit.

Summary: Potential demo-addressable objectives from Chapter 2 include helping students understand that dataset design can determine whether a learning system succeeds. Students should learn to identify features and labels, compare feature encodings such as integers versus one-hot vectors, reason about dataset size, balance, coverage, missing values, privacy, consent, and spurious correlations, and explain why a dataset should make the target pattern learnable rather than burying it in irrelevant variation.

UNIT 4: PARAMETRIC MODELING

Demos: No current "web-html/demos" directory is clearly assigned to this unit.

Summary: Potential demo-addressable objectives from Chapter 3 include helping students understand parametric models as software architectures with learned numerical parameters. Students should learn to distinguish architecture from parameters, compare parametric models with nonparametric methods such as nearest neighbors, represent examples as fixed-length feature vectors, map different task types to input and output spaces, and interpret linear, affine, polynomial, classification, and ranking architectures as different paths from features to predictions.

UNIT 5: REGRESSION

Summary: Students should learn to identify features and targets in regression problems, interpret fitted prediction functions in context, and connect model capacity to generalization. The demos emphasize how linear and polynomial models make predictions, how correlated features and noise affect interpretation, how mean squared error should be read in the application domain, and how train/test error reveals underfitting and overfitting.

Ames Housing Linear Regression
Link: regression/ames_housing_demo.html

A full linear regression model for Ames housing sale prices, visualized one feature at a time. The goal is to help students identify inputs and labels, interpret a fitted linear relationship, reason about correlated features, and read MSE in context. In the demo, students choose a feature view from the dropdown and compare the observed points with the model's red prediction line; "Reset to top feature" returns to the default feature.

Polynomial Regression Playground
Link: regression/regression_2d_interactive.html

A 2D polynomial regression surface with train and test error curves across polynomial degree. The goal is to help students connect polynomial degree to model capacity, underfitting, overfitting, noise, and generalization. In the demo, students adjust the polynomial degree slider, jump to the best test degree, or reset to the lowest degree while watching the fitted surface and error curves change.

UNIT 6: CLASSIFICATION

Summary: Students should learn to formulate classification tasks in terms of features, labels, scores, margins, decision boundaries, and losses. The demos emphasize how classifier assumptions shape decision boundaries, why reduced feature representations can lose important information, how hinge and logistic losses respond to signed margins, and how test error should be used to judge whether added flexibility actually improves generalization.

Cat vs Ship Inspector
Link: classification/cat_notcat_demo.html

CIFAR-10 cat-vs-ship points compressed into a 2D feature view, with multiple classifiers and decision boundaries. The goal is to help students compare classifier flexibility, decision-boundary shape, train/test behavior, and information loss from dimensionality reduction. In the demo, students choose a classifier, switch visible points between train/test views, select hard test points, and inspect how individual examples behave.

Cat vs Ship Demo
Link: classification/cat_vs_ship_demo.html

A reduced 2D cat-vs-ship classification visualization with classifier-dependent boundaries. The goal is to help students see how model choice changes the boundary and why generalization cannot be judged from flexibility alone. In the demo, students switch classifiers and compare the resulting boundary and performance information.

Linear Hinge Playground
Link: classification/linear_hinge_demo.html

A binary linear classifier trained with hinge loss, shown through score, signed-margin, and prediction surfaces. The goal is to help students connect features, labels, margins, misclassification, separation, hinge loss, and L2 regularization. In the demo, students adjust class separation, switch the surface view, and reset the view while comparing boundary and loss behavior.

Loss Comparison Playground
Link: classification/loss_comparison_demo.html

Linear classification boundaries and loss curves for shifted hinge, hinge, and logistic objectives. The goal is to help students compare how classification losses respond to signed margins, outliers, and boundary placement. In the demo, students choose a boundary view, switch objectives, overlay all boundaries, and inspect how point margins map onto each loss curve.

UNIT 7: NONLINEAR MODELS

Summary: Students should learn how neural networks use hidden layers, width, depth, and nonlinear activations to transform representations and model nonlinear patterns that linear models cannot capture. The demos emphasize XOR-style separability, layer-by-layer feature transformations, nonlinear regression behavior, capacity control, train/test generalization, overfitting, standardization, leakage, and the distinction between architecture choices that affect model capacity and choices that affect optimization.

Ames Housing MLP
Link: nonlinear_models/ames_housing_mlp_demo.html

A multilayer perceptron for Ames housing regression, visualized through one selected feature at a time. The goal is to help students distinguish a one-feature visualization from a full multifeature MLP and compare nonlinear prediction behavior with linear regression. In the demo, students select a housing feature and compare observed prices with the MLP's red prediction curve; "Reset to top feature" restores the default view.

MLP Depth Playground
Link: nonlinear_models/mlp_depth_demo.html

A fixed-width MLP whose number of hidden layers can be varied, with decision boundaries and accuracy curves. The goal is to help students understand depth as model capacity and diagnose generalization or overfitting from train/test accuracy. In the demo, students move the depth slider, jump to the best test depth, or reset to depth 1 while observing boundary and accuracy changes.

Fixed-Weight XOR Transform Demo
Link: nonlinear_models/mlp_fixed_xor_transform_demo.html

A hand-designed ReLU network that transforms an XOR-style dataset into a linearly separable representation. The goal is to help students see why XOR is not linearly separable and how fixed weights plus nonlinear activations can create separability. In the demo, students step through the network with previous/next controls, jump to the final layer, or reset to inspect each transformation.

MLP Layer Transform Demo
Link: nonlinear_models/mlp_layer_transform_demo.html

A trained width-2 MLP shown layer by layer as it warps a 2D point cloud. The goal is to help students understand how linear maps and ReLUs reshape representations across depth. In the demo, students step through layers, jump to the last transformation, or reset to compare intermediate representations.

MLP Width Playground
Link: nonlinear_models/mlp_width_demo.html

A fixed-depth MLP whose hidden-layer width can be varied, with decision boundaries and accuracy curves. The goal is to help students compare width and depth as capacity controls and identify when wider models overfit. In the demo, students move the width slider, jump to the best test width, or reset to the minimum width while observing boundary and accuracy changes.

Neural Network Playground
Link: nonlinear_models/nn_vis_demo.html

A configurable neural-network classifier across toy datasets, activations, depth, width, and learning rates. The goal is to help students connect dataset geometry, architecture, standardization, capacity, optimization, and train/test generalization. In the demo, students choose a dataset, activation, depth, width, and learning rate, then inspect the learned decision boundary and accuracy behavior.

UNIT 8: OPTIMIZATION AND BACKPROP

Summary: Students should learn how differentiable objectives are optimized with gradients, how the chain rule supports backpropagation through computation graphs, and how optimizer choices affect training trajectories. The demos emphasize forward values, local derivatives, full gradients, saved intermediate state, mini-batch gradient noise, learning-rate tuning, SGD versus full gradient descent, Adam's adaptive coordinate-wise steps, and the distinction between faster optimization and better generalization.

Adam vs SGD
Link: optimization/adam_vs_sgd_demo.html

Side-by-side SGD and Adam trajectories on the same loss surface. The goal is to help students compare global learning-rate behavior with Adam's coordinate-wise adaptation and distinguish optimization progress from generalization. In the demo, students adjust SGD and Adam learning rates, number of steps, gradient noise, and starting point, then rerun the comparison.

Batch Gradient Demo
Link: optimization/batch_gradient_demo.html

Full-batch and mini-batch gradient arrows for a linear regression loss surface. The goal is to help students understand mini-batch gradients as noisy estimates and compare batch size, sampling strategy, and SGD-style updates. In the demo, students choose batch selection mode, batch size, sampled batch count, and current model parameters, then resample batches or jump near the best fit.

Chain Rule Practice
Link: optimization/chain_rule_practice_demo.html

A chain-rule exercise for a small computation graph with forward values, local derivatives, and full gradients. The goal is to help students practice manual backpropagation and understand how multiple paths contribute to derivatives. In the demo, students fill derivative fields, check their work, reveal answers, or generate new numerical values.

Computation Graph Stepper
Link: optimization/computation_graph_stepper.html

A stepper for the computation graph f(x, y) = (sin(x) + xy)^2. The goal is to help students distinguish forward-pass values, local derivatives, and full gradients in a computation graph. In the demo, students set input x and y, then step forward and backward through the graph with previous/next/run-all controls.

Optimizer Playground
Link: optimization/optimizer_playground.html

Optimization trajectories on selectable differentiable surfaces for gradient descent, noisy SGD-style updates, and Adam. The goal is to help students diagnose learning-rate behavior, compare optimizer paths, and connect differentiability to gradient-based training. In the demo, students choose the surface, optimizer, learning rate, steps, noise, and starting point, then rerun the trajectory.

UNIT 9: TAILORING ARCHITECTURES TO DATA TYPES

Summary: Students should learn how architecture choices encode assumptions about the structure of different data types. The demos emphasize convolutional filters, padding, tensor dimensions, flattening, dense layers, and image-specific inductive biases for CNNs, as well as node features, labels, attention-weighted message passing, receptive fields, depth effects, and misclassification analysis for graph neural networks.

MNIST CNN Layer Visualizer
Link: CNN/mnist_cnn_vis_demo.html

An MNIST convolutional network visualized across convolution, flattening, dense layers, and predictions. The goal is to help students track tensor dimensions, interpret early versus later convolutional features, and connect CNN structure to image-specific inductive biases. In the demo, students clear or randomize the digit input and inspect how layer activations and predictions change.

Convolution Filter Playground
Link: CNN/vis_filters_demo.html

A convolution playground with selectable images, filters, stride, padding, and uploaded images. The goal is to help students understand how kernels, stride, and valid versus same padding determine convolution outputs. In the demo, students choose or upload an image, select a filter, adjust stride and padding, and inspect the resulting output map.

GAT Node Classification Playground
Link: graphs/gat_demo.html

A graph attention network node-classification visualization with attention, depth, activation slope, and self-loop controls. The goal is to help students understand attention-weighted message passing, receptive fields, depth effects, and node misclassifications. In the demo, students adjust attention temperature, layer depth, LeakyReLU alpha, and self-loops, then run permutation tests or train the model.

UNIT 10: GENERATIVE MODELS

Summary: Students should learn to distinguish the real data-generating process, finite observed datasets, learned model distributions, density or probability mass, and samples. The demos emphasize why continuous density is not the same as point probability, how empirical samples approximate a distribution as sample size grows, how simple latent noise can be transformed into structured generated data, and how model misspecification appears when a simple distribution family cannot match reality.

Distribution vs Density vs Sample
Link: generative_models/distribution_density_sample_demo.html

Continuous and discrete distributions, inspected density or probability mass, and drawn samples. The goal is to help students distinguish a distribution from density or mass at one location and from finite sampled data. In the demo, students choose a distribution, inspect a location, draw 1, 20, or 100 samples, and reset the sample set.

Noise To Data Map
Link: generative_models/noise_to_data_map_demo.html

Latent noise samples transformed through affine, ring, cluster, or spiral maps into structured output data. The goal is to help students understand the roles of latent z, generated x, and parameters theta in a generative model. In the demo, students choose the map, adjust sample count and highlighted sample, resample z, and step through highlighted points.

Reality vs Dataset vs Model
Link: generative_models/reality_dataset_model_demo.html

A hidden reality distribution, a finite sampled dataset, and a learned model distribution. The goal is to help students distinguish reality, empirical data, and fitted model assumptions, including model misspecification. In the demo, students choose the reality distribution and model family, adjust sample size or KDE bandwidth, resample the dataset, and add more data.

UNIT 11: INTERPRETABILITY

Summary: Students should learn to distinguish different kinds of model explanations and evaluate what each explanation can and cannot justify. The demos emphasize spatial explanations such as Grad-CAM, local surrogate explanations such as LIME, text rationales, and training-example attribution, with attention to faithfulness, sufficiency, locality, segmentation and sampling choices, model and data limitations, harmful or helpful training examples, and the difference between feature attribution and data attribution.

Animal Grad-CAM Explorer
Link: interpretability/cam_gradcam_stepper.html

Grad-CAM heatmaps for animal-image predictions, with sample or uploaded images and label-specific explanations. The goal is to help students understand how class scores become spatial explanations and why explanation quality depends on the model and image. In the demo, students choose or upload an image, select the animal label to explain, adjust overlay opacity and threshold, recompute, explain the top animal, or reset the sample.

LIME Neighborhood Builder
Link: interpretability/lime_neighborhood_demo.html

LIME-style local explanations generated from masked image perturbations. The goal is to help students understand local surrogate explanations, support/opposition regions, locality, sample count, and segmentation effects. In the demo, students choose or upload an image, pick the label, adjust perturbation count, kernel width, and explanation budget, then run LIME or change locality.

Text Rationale Extractor
Link: interpretability/text_rationale_extractor.html

Movie-review rationales for selected aspects such as performance, story, and style. The goal is to help students evaluate rationale concision, sufficiency, faithfulness, and the difference between model-useful and human-satisfying evidence. In the demo, students choose a movie and aspect, adjust rationale budget, auto-select top tokens, clear selections, or reset the movie.

Training Example Attribution
Link: interpretability/training_example_attribution_demo.html

A training-data attribution inspector for how training points affect a selected test prediction. The goal is to help students distinguish helpful, redundant, harmful, mislabeled, and ambiguous examples, and compare data attribution with feature attribution. In the demo, students choose a dataset scenario, test point, attribution metric, and training point to inspect, then remove selected or most harmful points and restore them.

UNIT 12: REINFORCEMENT LEARNING

Summary: Students should learn how agents evaluate actions and policies from rewards over time, both when a transition model is known and when learning from sampled experience. The demos emphasize discounted return, the role of gamma, delayed and sparse rewards, reward shaping, stochastic transitions, risky policies, Bellman backups, value iteration convergence, Q-learning, bootstrapped TD targets, exploration, learning rates, and unintended behavior from poorly designed reward functions.

Discounted Return Lab
Link: reinforcement-learning/discounted_return_demo.html

Reward sequences, discounted contributions, and utility curves across discount factors. The goal is to help students understand discounted return, delayed rewards, gamma, and why equal undiscounted sums can imply different utilities. In the demo, students choose a reward sequence, adjust horizon and gamma, resample rewards, or jump to gamma = 0.98.

Q-Learning Playground
Link: reinforcement-learning/q_learning_playground.html

A stochastic gridworld where an agent learns Q-values from sampled experience. The goal is to help students understand model-free learning, TD targets, exploration, learning rates, epsilon decay, and learned greedy policies. In the demo, students adjust alpha, gamma, epsilon, epsilon decay, and living reward, then run one step, one episode, 25 episodes, or reset.

Reward Shaping Gridworld
Link: reinforcement-learning/reward_shaping_policy_demo.html

A stochastic gridworld policy visualization controlled by living reward, gamma, and slip probability. The goal is to help students understand how reward shaping and stochasticity change optimal policies and can create unintended behavior. In the demo, students adjust living reward, gamma, and slip probability, apply small or large penalty presets, or reset to the chapter setting.

Bellman Backup Stepper
Link: reinforcement-learning/value_iteration_stepper.html

Step-by-step value iteration in a stochastic gridworld with Bellman backup and convergence views. The goal is to help students understand value propagation, Bellman backups, policy changes before convergence, and stopping criteria. In the demo, students choose the displayed iteration, living reward, gamma, and slip probability, then step previous/next, jump ahead, or reset.
