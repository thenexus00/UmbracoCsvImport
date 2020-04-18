﻿function CsvImportController(
    contentTypeResource,
    contentResource,
    editorService) {

    var vm = this;

    vm.window = {
        _currentIndex: 0,
        steps: [true, false],
        moveTo: function (index) {
            angular.forEach(this.steps, (val, idx) => this.steps[idx] = false);
            this.steps[index] = true;
            this._currentIndex = index;
        },
        next: function () {
            this.moveTo(++this._currentIndex);
        }
    }

    vm.isCsvReady = false;
    vm.upload = function () {
        var file = document.getElementById('csvImportFile').files[0];
        Papa.parse(file, {
            header: true,
            complete: function (results) {
                vm.csvHeaders = results.meta.fields;
                vm.csvData = results.data.slice(0, 5);
                vm.totalCsvRows = vm.csvData.length;
                vm.isCsvReady = true;
            }
        });

        vm.window.next();
    };

    vm.selectParentNode = function () {
        var contentPickerConfig = {
            submit: function (model) {
                vm.parentNodeId = model.selection[0].id;
                contentTypeResource.getAllowedTypes(vm.parentNodeId)
                    .then(function (result) {
                        vm.contentTypes = result.map(item => ({ id: item.id, name: item.name, alias: item.alias }));
                        editorService.close();
                        vm.window.next();
                    });
            },
            close: function () {
                editorService.close();
            }
        }
        editorService.contentPicker(contentPickerConfig);
    }

    vm.processingContentType = false;
    vm.processContentType = function () {
        contentTypeResource.getById(vm.selectedContentType.id).then(function (result) {
            contentResource.getScaffold(vm.parentNodeId, vm.selectedContentType.alias)
                .then(function (scaffold) {
                    var myDoc = scaffold;
                    vm.editableVariants = [];
                    angular.forEach(myDoc.variants, function (variant) {
                        vm.editableVariants.push(angular.copy(variant));
                    });
                    vm.window.next();
                });
        });
    }

    vm.processing = false;
    vm.submit = function () {
        if (vm.importForm.$valid) {
            vm.processing = true;
            vm.currentItem = 0;

            processData();
        }
        else {
            console.log('Invalid form');
        }
    }

    function processData() {
        var row = vm.csvData[0];
        if (row) {
            contentResource.getScaffold(vm.parentNodeId, vm.selectedContentType.alias)
                .then(function (scaffold) {
                    var myDoc = scaffold;
                    myDoc.variants.length = 0;
                    myDoc.variants.push.apply(myDoc.variants, vm.editableVariants);
                    angular.forEach(myDoc.variants, function (variant) {
                        variant.name = row[variant.csvHeader].substring(0, 250);
                        angular.forEach(variant.tabs, function (tab) {
                            angular.forEach(tab.properties, function (prop) {
                                var fieldValue = row[prop.csvHeader];
                                if (fieldValue) {
                                    switch (prop.editor) {
                                        case 'Umbraco.TextBox':
                                            fieldValue = fieldValue.substring(0, 250);
                                            break;
                                        default:
                                    }
                                    prop.value = fieldValue;
                                }
                            });
                        });

                        variant.save = true;
                        variant.publish = true;
                    });

                    contentResource.publish(myDoc, true, [''], false)
                        .then(function (content) {
                            vm.currentItem++;
                            vm.csvData.shift();
                            processData();
                        });
                });
        }
        else {
            vm.processing = false;
            vm.window.next();
        }
    }
};

angular.module("umbraco").controller("CsvImportController", CsvImportController);