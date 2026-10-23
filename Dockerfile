FROM node:24-bookworm-slim AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY . .
RUN dotnet restore TenderOps.slnx --locked-mode
RUN dotnet publish src/TenderOps.Api -c Release --no-restore -o /out/api
RUN dotnet publish src/TenderOps.Worker -c Release --no-restore -o /out/worker
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS api
WORKDIR /app
COPY --from=build /out/api ./
COPY --from=web /web/dist ./wwwroot
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "TenderOps.Api.dll"]
FROM mcr.microsoft.com/dotnet/runtime:10.0 AS worker
WORKDIR /app
COPY --from=build /out/worker ./
USER $APP_UID
ENTRYPOINT ["dotnet", "TenderOps.Worker.dll"]
