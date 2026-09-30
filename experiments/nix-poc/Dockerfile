# Alternative image build recipe. The actual template POC used sbx template save.
# This Dockerfile is supplied for follow-on CI work, not claimed as build-tested.
FROM docker/sandbox-templates:shell-docker@sha256:1560168ac5fb9ce23d413c878349334c5845c07e264cd675d7867f0c78ad1761
USER agent
COPY --chown=agent:agent kit/files/home/nix-poc /home/agent/nix-poc
RUN bash /home/agent/nix-poc/bootstrap.sh \
 && bash /home/agent/nix-poc/apply.sh v1
